/* Run this after adding or editing carrier sentences. It reports any item
   the gate could build with two right answers in it. */
const {JSDOM}=require('jsdom'); const fs=require('fs');
const F='/mnt/user-data/outputs/';
const w=new JSDOM('<!doctype html><html><body></body></html>',
  {runScripts:"outside-only",url:"https://x.test/"}).window;
w.speechSynthesis={getVoices:()=>[],cancel(){},speak(u){u.onend&&u.onend();},addEventListener(){},removeEventListener(){}};
w.SpeechSynthesisUtterance=function(t){this.text=t;};
['profile.js','word-sentences.js','word-challenge.js','word-gate.js']
  .forEach(f=>w.eval(fs.readFileSync(F+f,'utf8')));
const WS=w.WordSentences, WG=w.WordGateState;

let sets=0, clashes=[], noCarrier=[], multiBlank=[], selfReveal=[];
for(const word of WS.words()){
  for(const s of WS.map[word]){
    const n=(s.match(new RegExp(WS.BLANK,'g'))||[]).length;
    if(n!==1) multiBlank.push(word+': '+s);
    if(new RegExp('\\b'+word+'\\b','i').test(s.replace(WS.BLANK,''))) selfReveal.push(word+': '+s);
  }
  for(const n of [3,4,5]){
    for(let k=0;k<30;k++){
      const set=WG.buildOptions(word,n); sets++;
      for(const o of set){
        if(o.type==='target') continue;
        if(WS.interchangeable(word,o.w)) clashes.push(word+' / '+o.w);
      }
    }
  }
}
console.log("CARRIER SENTENCE CHECK");
console.log("  words with carriers   :", WS.words().length);
console.log("  option sets built     :", sets);
console.log("  TWO RIGHT ANSWERS     :", clashes.length ? [...new Set(clashes)] : "none");
console.log("  wrong number of blanks:", multiBlank.length ? multiBlank : "none");
console.log("  answer shown in its own sentence:", selfReveal.length ? selfReveal : "none");
console.log();
console.log("  a word's forbidden partners, e.g. 'had':");
console.log("   ", JSON.stringify(WS.rivals('had')));
