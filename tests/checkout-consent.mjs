export const CONSENT_VERSION = 'digital-content-immediate-supply-v1';
export function validateCourseConsent({productType,immediateSupply,acknowledgesLoss,termsAccepted,consentVersion}) {
  if(productType !== 'one_time_digital_course') return {allowed:false,reason:'wrong_product_type'};
  if(consentVersion !== CONSENT_VERSION) return {allowed:false,reason:'outdated_consent'};
  if(immediateSupply !== true || acknowledgesLoss !== true || termsAccepted !== true) return {allowed:false,reason:'affirmative_consent_required'};
  return {allowed:true};
}
export function membershipCancellation({currentPeriodEnd,cancelAtPeriodEnd}) {
  if(cancelAtPeriodEnd !== true || !Number.isInteger(currentPeriodEnd) || currentPeriodEnd<=0) return {valid:false};
  return {valid:true,accessEndsAt:currentPeriodEnd};
}
