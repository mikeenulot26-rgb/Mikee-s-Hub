'use strict';
const crypto=require('node:crypto');
function key(){const raw=process.env.ASSISTANT_AUDIT_KEY||'',bytes=Buffer.from(raw,'base64');return bytes.length===32?bytes:null}
function seal(value,user){const secret=key();if(!secret)throw Error('Assistant audit encryption is not configured.');const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',secret,iv);cipher.setAAD(Buffer.from(user));const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return{encrypted:1,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')}}
function open(value,user){if(!value?.encrypted)return value;const secret=key();if(!secret)throw Error('Assistant audit encryption needs configuration.');const decipher=crypto.createDecipheriv('aes-256-gcm',secret,Buffer.from(value.iv,'base64'));decipher.setAAD(Buffer.from(user));decipher.setAuthTag(Buffer.from(value.tag,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.ciphertext,'base64')),decipher.final()]).toString('utf8'))}
function result(value,user){if(value?.encrypted)return{...open(value,user),saved:value.saved,revision:value.revision,duplicate:value.duplicate};return value}
function metadata(patches){return patches.map(p=>({area:p.area,id:p.id,fields:[...new Set([...Object.keys(p.before||{}),...Object.keys(p.after||{})])].filter(k=>JSON.stringify(p.before?.[k])!==JSON.stringify(p.after?.[k]))}))}
module.exports={key,seal,open,result,metadata};
