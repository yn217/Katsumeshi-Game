export function createAudioDirector() {
  let context=null,bgmBus=null,seBus=null,currentTrack=null,bgmSource=null,frySource=null;
  let bgmLoadingTrack=null,fryLoading=false,frying=false,bgmVolume=0.4,seVolume=0.6;
  const buffers=new Map();

  function ensureContext(){
    if(context)return context;
    const AudioContextClass=window.AudioContext||window.webkitAudioContext;
    if(!AudioContextClass)return null;
    context=new AudioContextClass();bgmBus=context.createGain();seBus=context.createGain();
    bgmBus.connect(context.destination);seBus.connect(context.destination);setVolumes(bgmVolume*100,seVolume*100);
    return context;
  }
  async function loadBuffer(category,name){
    const key=category+":"+name;if(buffers.has(key))return buffers.get(key);
    const filename=category==="bgm"?`bgm_${name}_v03.wav`:`se_${name}_v03.wav`;
    const url=new URL(`../public/assets/game/audio/${category}/${filename}`,import.meta.url);
    const pending=fetch(url).then(r=>{if(!r.ok)throw new Error(`Audio ${r.status}: ${filename}`);return r.arrayBuffer();}).then(data=>ensureContext().decodeAudioData(data));
    buffers.set(key,pending);
    try{const decoded=await pending;buffers.set(key,decoded);return decoded;}
    catch(error){buffers.delete(key);console.warn("Audio asset unavailable",filename,error);return null;}
  }
  function stop(source){if(source){try{source.stop();}catch{}try{source.disconnect();}catch{}}}
  async function startTrack(track=currentTrack){
    if(!track||!context||context.state!=="running"||bgmSource||bgmLoadingTrack===track)return;
    bgmLoadingTrack=track;const buffer=await loadBuffer("bgm",track);bgmLoadingTrack=null;
    if(!buffer||track!==currentTrack||context.state!=="running"||bgmSource)return;
    const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(bgmBus);source.start();bgmSource=source;
    source.onended=()=>{if(bgmSource===source)bgmSource=null;};
  }
  async function startFry(){
    if(!frying||!context||context.state!=="running"||frySource||fryLoading)return;
    fryLoading=true;const buffer=await loadBuffer("se","fry");fryLoading=false;
    if(!buffer||!frying||context.state!=="running"||frySource)return;
    const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(seBus);source.start();frySource=source;
    source.onended=()=>{if(frySource===source)frySource=null;};
  }
  async function activate(){
    const ctx=ensureContext();if(!ctx)return false;
    try{await ctx.resume();}catch{return false;}
    startTrack();startFry();return true;
  }
  function setTrack(track){
    if(track===currentTrack)return;
    currentTrack=track;stop(bgmSource);bgmSource=null;
    if(track&&context?.state==="running")startTrack(track);
  }
  function setVolumes(bgm,se){
    bgmVolume=Math.max(0,Math.min(100,Number(bgm)||0))/100;
    seVolume=Math.max(0,Math.min(100,Number(se)||0))/100;
    if(!context)return;const now=context.currentTime;
    bgmBus.gain.setTargetAtTime(bgmVolume*0.32,now,0.04);seBus.gain.setTargetAtTime(seVolume*0.42,now,0.04);
  }
  function setFrying(active){
    frying=!!active;
    if(!frying){stop(frySource);frySource=null;return;}
    startFry();
  }
  async function play(id){
    if(!context||context.state!=="running"||seVolume<=0)return;
    const buffer=await loadBuffer("se",id);
    if(!buffer||context.state!=="running"||seVolume<=0)return;
    const source=context.createBufferSource();source.buffer=buffer;source.connect(seBus);source.start();
    source.onended=()=>{try{source.disconnect();}catch{}};
  }
  return{activate,setTrack,setVolumes,setFrying,play};
}
