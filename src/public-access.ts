/** Keep experience codes out of bundles and localStorage; the server sets an
 * HttpOnly session cookie after a successful unlock. */
export async function apiFetch(input:RequestInfo|URL,init?:RequestInit){
 const response=await fetch(input,init);
 if(response.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('personaverse-unlock-required'));
 return response;
}
