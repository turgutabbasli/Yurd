import test from 'node:test';
import assert from 'node:assert/strict';
import { api, db } from './api.ts';

test('Competition four-eyes rule: creator cannot approve', async () => {
  db.resetToDefault();
  
  // Login as operator
  await api.loginWithFin('7MN12PZ');
  
  // Create competition
  const comp = await api.createCompetition({
    number: 'TEST-2026',
    name: 'Sınaq Müsabiqəsi',
    directions: ['MEYVE_BAGI'],
    announceDate: '2026-10-15T00:00:00Z',
    applyStart: '2026-11-01T00:00:00Z',
    applyDeadline: '2026-12-01T23:59:59Z',
    leaseInitialYears: 5,
    leaseExtensionYears: 44,
    minProjectHa: 20,
    participationFeeAzn: 50,
    conditionsText: 'Sınaq şərtləri',
    parcelIds: ['pcl-fzl-008']
  });
  
  assert.equal(comp.status, 'QARALAMA');
  
  // Submit for approval
  await api.submitCompetition(comp.id);
  assert.equal(comp.status, 'TESDIQ_GOZLEYIR');
  
  // Operator attempts to approve their own competition -> should throw
  await assert.rejects(async () => {
    await api.approveCompetition(comp.id);
  }, /icazəniz yoxdur/);
  
  // Switch to tesdiqleyici
  await api.loginWithFin('8RT34WQ');
  
  // Tesdiqleyici approves
  const approvedComp = await api.approveCompetition(comp.id);
  assert.equal(approvedComp.status, 'DERC_EDILIB');
  assert.equal(approvedComp.approvedBy, 'usr-tesdiqleyici-1');
  
  // Check parcel status became ACIQ
  const p = api.getParcelById('pcl-fzl-008');
  assert.equal(p?.status, 'ACIQ');
});

test('Decision four-eyes and auto-rejection of competing applications', async () => {
  db.resetToDefault();
  
  // Target parcel pcl-cbr-003
  // Login as applicant 2 and create application
  await api.loginWithFin('4CD67EF');
  const competingApp = await api.createApplication({
    competitionId: 'comp-3',
    parcelId: 'pcl-cbr-003',
    intendedCrop: 'BUGDA',
    plannedInvestmentAzn: 300000,
    ownFundsAzn: 100000,
    expectedJobs: 10,
    planText: 'Rəqib taxılçılıq layihəsi.',
    startDate: '2026-12-01',
    isDraft: false,
    location: { lat: 39.38, lon: 47.0 },
    durationMonths: 48
  });
  
  // Login as operator to propose decision for app-003 (owned by test sahibkar on pcl-cbr-003)
  await api.loginWithFin('7MN12PZ');
  await api.proposeDecision('app-003', 'TESDIQLENIB', 'Layihə optimaldır və tələblərə cavab verir.');
  
  // Operator cannot confirm decision
  await assert.rejects(async () => {
    await api.confirmDecision('app-003');
  }, /icazəniz yoxdur/);
  
  // Login as tesdiqleyici to confirm decision
  await api.loginWithFin('8RT34WQ');
  const confirmed = await api.confirmDecision('app-003');
  assert.equal(confirmed.status, 'QERAR_VERILIB');
  assert.equal(confirmed.outcome, 'TESDIQLENIB');
  
  // Parcel must become AYRILIB
  const parcel = api.getParcelById('pcl-cbr-003');
  assert.equal(parcel?.status, 'AYRILIB');
  
  // Competing application must be auto-rejected with specific comment
  const other = api.getApplicationById(competingApp.id);
  assert.equal(other?.status, 'QERAR_VERILIB');
  assert.equal(other?.outcome, 'REDD_EDILIB');
  const lastHistory = other?.statusHistory?.[other.statusHistory.length - 1];
  assert.equal(lastHistory?.comment, 'Bu sahə başqa müraciətçiyə ayrılıb');
});

test('Entrepreneur selects one investor offer; the others are rejected', async () => {
  db.resetToDefault();

  await api.loginWithFin('5AB78CD');
  const offers = api.getOffersForApplication('app-001');
  assert.equal(offers.length, 3);

  const updated = await api.selectOffer('off-002');
  assert.equal(updated.status, 'INVESTOR_SECILDI');
  assert.equal(updated.selectedOfferId, 'off-002');

  const after = api.getOffersForApplication('app-001');
  assert.equal(after.find(o => o.id === 'off-002')?.status, 'QEBUL_EDILDI');
  assert.equal(after.filter(o => o.status === 'REDD_EDILDI').length, 2);

  // Offer intake is closed: a second selection and new offers are refused
  await assert.rejects(async () => {
    await api.selectOffer('off-001');
  }, /seçilib/);
  await api.loginWithFin('6JK99XY');
  assert.equal(api.getMyOffers().find(o => o.id === 'off-001')?.status, 'REDD_EDILDI');
  await assert.rejects(async () => {
    await api.createOffer({
      applicationId: 'app-001',
      amountAzn: 100000,
      model: 'ICARE',
      leaseFeeAznPerYear: 5000,
      durationMonths: 60,
      plannedActivity: 'Taxılçılıq',
      message: '',
      company: 'Test',
      profile: ''
    });
  }, /bağlanıb/);
});

test('myGov demo login: role comes from the account (FİN or passport)', async () => {
  db.resetToDefault();

  const roles: Record<string, string> = { '5AB78CD': 'SAHIBKAR', '6JK99XY': 'INVESTOR', '7MN12PZ': 'OPERATOR', '8RT34WQ': 'TESDIQLEYICI' };
  for (const [fin, role] of Object.entries(roles)) {
    const res = await api.loginWithFin(fin.toLowerCase());
    assert.equal(res.user.role, role);
  }
  await assert.rejects(() => api.loginWithFin('ZZZ9999'), /tapılmadı/);
  await assert.rejects(() => api.loginWithFin('12'), /7 simvol/);

  const james = { firstName: 'James', lastName: 'Carter', citizenship: 'Birləşmiş Krallıq', passportNumber: 'gb5478213', birthDate: '1984-03-12', passportExpiry: '2031-06-30' };
  const ok = await api.loginWithPassport(james);
  assert.equal(ok.user.id, 'usr-foreign-1');
  assert.equal(ok.created, false);
  await assert.rejects(() => api.loginWithPassport({ ...james, lastName: 'Smith' }), /uyğun gəlmir/);
  await assert.rejects(() => api.loginWithPassport({ ...james, passportExpiry: '2020-01-01' }), /müddəti bitib/);
  await assert.rejects(() => api.loginWithPassport({ ...james, passportNumber: 'AB-1' }), /6–12/);

  const fresh = await api.loginWithPassport({ ...james, firstName: 'Lena', lastName: 'Novak', passportNumber: 'CZ1234567' });
  assert.equal(fresh.created, true);
  assert.equal(fresh.user.role, 'INVESTOR');
});
