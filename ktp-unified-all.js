/* Math Teacher — stable unified KTP loader
   Reads the previously uploaded complete KTP payload from its Git blob,
   sanitizes the base64 wrapper, then exposes window.ktpD/window.ktpReady. */
(async()=>{
  try{
    const blobUrl='https://api.github.com/repos/KUKA374/My-website/git/blobs/3f18aecf65d7dfa71cfa56df28caa2556716fc56';
    const r=await fetch(blobUrl,{headers:{Accept:'application/vnd.github+json'}});
    if(!r.ok)throw new Error('KTP blob fetch failed: '+r.status);
    const blob=await r.json();
    const encoded=String(blob.content||'').replace(/\s/g,'');
    const sourceBytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
    const source=new TextDecoder().decode(sourceBytes);
    const m=source.match(/const b64=\"([^\"]+)\"/);
    if(!m)throw new Error('KTP payload was not found in the saved blob');
    const b64=m[1].replace(/[^A-Za-z0-9+/=]/g,'');
    const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const data=await new Response(stream).json();
    window.ktpD=Object.assign(window.ktpD||{},data);
    window.ktpReady=Promise.resolve(window.ktpD);
    console.log('Unified KTP loaded:',Object.keys(data));
  }catch(e){
    console.error('Unified KTP load error',e);
    window.ktpReady=Promise.reject(e);
  }
})();
