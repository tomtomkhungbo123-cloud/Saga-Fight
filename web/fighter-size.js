// Uniform model sizing only; world positions, attack ranges and damage stay in world units.
(()=>{const height=164,native={cylast:170,aether:198,melanta:177};
window.FighterSize=Object.freeze({height,scale:type=>native[type]?height/native[type]:1});})();
