export function parseProviderId(status, body) {
  if (status < 200 || status >= 300) return {ok:false, reason:'provider_rejected'};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {ok:false, reason:'invalid_json'};
  const id=body.id;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{6,128}$/.test(id)) return {ok:false, reason:'missing_or_invalid_id'};
  return {ok:true,id};
}
export function finishClaim(row, token, providerResult) {
  if (!row || row.status !== 'leased' || row.lease_token !== token || !(row.lease_until > Date.now())) return {ok:false,reason:'stale_claim',row};
  if (!providerResult.ok) return {ok:false,reason:'provider_unconfirmed',row};
  if (row.provider_message_id && row.provider_message_id !== providerResult.id) return {ok:false,reason:'conflicting_provider_id',row};
  return {ok:true,row:{...row,status:'accepted',provider_message_id:providerResult.id,lease_token:null,lease_until:null}};
}
