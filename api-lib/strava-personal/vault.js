import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
// Proposed separate token vault envelope. Key comes from future approved secret
// configuration; never share it with OAuth state, logs, frontend or LIVE.
const aad=b=>Buffer.from(JSON.stringify([b.clientId,b.userId,b.athleteId,b.revision]));
function validate(key,b){if(!Buffer.isBuffer(key)||key.length!==32||!b?.clientId||!b.userId||!b.athleteId||!Number.isSafeInteger(b.revision)||b.revision<1)throw Error('Invalid vault key/binding.');}
export function sealTokens(tokens,key,binding){validate(key,binding);const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(aad(binding));const data=Buffer.concat([cipher.update(JSON.stringify(tokens),'utf8'),cipher.final()]);return {version:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),data:data.toString('base64')};}
export function openTokens(envelope,key,binding){validate(key,binding);try{if(envelope.version!==1)throw Error();const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));decipher.setAAD(aad(binding));decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.data,'base64')),decipher.final()]).toString('utf8'));}catch{throw Error('Token vault binding or integrity check failed.');}}
