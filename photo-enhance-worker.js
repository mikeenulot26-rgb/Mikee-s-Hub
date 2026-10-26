'use strict';
importScripts('core.js');
self.onmessage=event=>{try{const {buffer,width,preset,intensity}=event.data,data=new Uint8ClampedArray(buffer);StudioCore.enhance(data,preset,intensity,{width});self.postMessage({buffer:data.buffer},[data.buffer])}catch{self.postMessage({error:'Enhancement could not complete. Your original is unchanged; try the resized output.'})}};
