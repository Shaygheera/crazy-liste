// Logique de synchronisation (pure) : blocs du HTML livré exécutés dans Node.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './helpers/load-core.mjs';

const { Core: C, Data: D } = loadCore();
const show = (eps, at) => { const t = C.emptyTrack('tv', 1); t.inLibrary = true; for (const e of eps) C.writeEpisode(t, 1, e, 'seen'); t.lastActivityAt = at; return t; };

describe('Synchronisation : empreintes et changements locaux', () => {
  it('l’empreinte ne dépend pas de l’ordre des clés', () => {
    assert.equal(D.fingerprint({ a: 1, b: { c: 2, d: 3 } }), D.fingerprint({ b: { d: 3, c: 2 }, a: 1 }));
    assert.notEqual(D.fingerprint(show([1], 5)), D.fingerprint(show([1, 2], 5)));
    assert.equal(D.fingerprint(null), D.fingerprint(undefined));
  });
  it('repère ajouts, modifications et suppressions, sans doublon', () => {
    const s = D.emptySyncState('u');
    const tracking = { 'tv-1': show([1], 10) };
    assert.deepEqual(D.markLocalChanges(s, tracking, 100, false), ['tv-1']);
    assert.deepEqual(D.markLocalChanges(s, tracking, 200, false), [], 'pas de nouvelle date sans changement');
    assert.equal(s.dirty['tv-1'].at, 100);
    D.confirmPush(s, 'tv-1', D.fingerprint(tracking['tv-1']), 100);
    assert.deepEqual(s.dirty, {});
    delete tracking['tv-1'];
    assert.deepEqual(D.markLocalChanges(s, tracking, 300, false), ['tv-1'], 'suppression à envoyer');
    assert.equal(s.dirty['tv-1'].h, D.fingerprint(null));
  });
  it('première connexion : la date d’activité locale sert de date', () => {
    const s = D.emptySyncState('u');
    D.markLocalChanges(s, { 'tv-1': show([1], 42) }, 999, true);
    assert.equal(s.dirty['tv-1'].at, 42);
  });
});

describe('Synchronisation : réception', () => {
  it('version distante plus récente appliquée, version locale plus récente conservée', () => {
    const s = D.emptySyncState('u');
    const local = show([1], 10);
    D.markLocalChanges(s, { 'tv-1': local }, 500, false);
    assert.equal(D.reconcileRemote(s, 'tv-1', { track: show([1, 2], 20), at: 400 }, local), 'push', 'local modifié à 500 > distant 400');
    assert.equal(D.reconcileRemote(s, 'tv-1', { track: show([1, 2, 3], 30), at: 600 }, local), 'apply', 'distant 600 > local 500');
    assert.deepEqual(s.dirty, {});
  });
  it('identique : rien à faire ; distant ancien face à une version connue plus récente : renvoi', () => {
    const s = D.emptySyncState('u');
    const t = show([1], 10);
    assert.equal(D.reconcileRemote(s, 'tv-1', { track: t, at: 50 }, t), 'same');
    s.known['tv-1'] = { h: D.fingerprint(t), at: 80 };
    assert.equal(D.reconcileRemote(s, 'tv-1', { track: show([], 0), at: 60 }, t), 'push');
  });
  it('documents distants validés comme un import', () => {
    const t = show([1, 2], 10);
    const doc = D.buildRemoteDoc(t, { title: 'Série <b>' }, 77);
    const back = D.parseRemoteDoc('tv-1', doc);
    assert.equal(back.at, 77);
    assert.deepEqual(back.track.seasons, t.seasons);
    assert.equal(back.meta.title, 'Série <b>', 'texte gardé tel quel, échappé à l’affichage');
    assert.equal(D.parseRemoteDoc('tv-1', { at: 5, track: null }).track, null, 'suppression');
    assert.equal(D.parseRemoteDoc('tv-1', { at: 5, track: '{oops' }), null);
    assert.equal(D.parseRemoteDoc('tv-1', { at: 'x', track: null }), null);
    assert.equal(D.parseRemoteDoc('../etc', { at: 5, track: null }), null);
    assert.equal(D.parseRemoteDoc('tv-1', { at: 5, track: JSON.stringify({ seasons: { 1: { episodes: { 1: 'hack' } } } }) }).track, null, 'statut invalide ignoré, contenu non personnel');
  });
  it('état de synchronisation corrompu : repart de zéro', () => {
    assert.deepEqual(D.sanitizeSyncState('n’importe quoi'), D.emptySyncState(null));
    const s = D.sanitizeSyncState({ uid: 'u', known: { 'tv-1': { h: 'x', at: 3 }, bad: { h: 1 } }, dirty: [], keyAt: 'x' });
    assert.deepEqual(s.known, { 'tv-1': { h: 'x', at: 3 } });
    assert.equal(s.keyAt, 0);
  });
});
