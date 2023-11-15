//wait for page to load
document.addEventListener("DOMContentLoaded", function(event){
    var audioCtx = null;

    function bBounce(obt, oa, odt, timePassed) {
        singleBounce(obt, oa, odt, timePassed)

        // linear envelope, 3000 ms to 0, for decreasing bounce parameters
        var nbt = obt -(obt/10).toFixed(15);
        var na = oa - (oa/30).toFixed(15);
        var ndt = odt -(odt/15).toFixed(15);
        var ntp = timePassed + obt;
        // console.log(nbt, na, ndt)

        if (nbt > 50){
            setTimeout(() => {bBounce(nbt, na, ndt, ntp)}, nbt);
        }
    }

    function singleBounce(bounceTime, amp, decayTime, timePassed){
        var bT = bounceTime/1000
        var dT = decayTime/1000
        var hit = (bT-dT)
        // 0 to max gain in bounceTime - decayTime, then max gain to 0 in updated decay time

        // 120Hz Thud
        thud = audioCtx.createOscillator();
        thudGain = audioCtx.createGain();
        thud.connect(thudGain).connect(audioCtx.destination);
        thud.frequency.value = 120;
        thudGain.gain.value = 0.0001;
        thud.start();
        thudGain.gain.exponentialRampToValueAtTime(0.4*amp, audioCtx.currentTime + hit/2);
        thudGain.gain.exponentialRampToValueAtTime(0.2*amp, audioCtx.currentTime + hit);
        setTimeout(() => {thudGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + bT)}, hit + (dT/4).toFixed(10));
        thud.stop(bT+1);

        // FM carrier frequency sweep from (210-80)*70*amp
        // modulation frequency scaled by 70Hz according to bounce height
        // approximated as an exponential instead of inverse square law

        var carrier = audioCtx.createOscillator();
        var modulationFreq = audioCtx.createOscillator();
        modulationFreq.frequency.value = 210;
        // modulationFreq.frequency.setValueAtTime(210 - (130/3000).toFixed(10)*timePassed, audioCtx.currentTime);
        modulationFreq.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + hit);

        var modulationIndex = audioCtx.createGain();
        modulationIndex.gain.value = 70*amp;

        modulationFreq.connect(modulationIndex).connect(carrier.frequency);

        console.log(carrier.frequency.value);

        var balance = audioCtx.createGain();
        balance.gain.value = 0.5
        balance.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + bT);
        carrier.connect(balance).connect(audioCtx.destination);

        carrier.start();
        modulationFreq.start();

        carrier.stop(audioCtx.currentTime + bT + 0.5);
        modulationFreq.stop(audioCtx.currentTime + bT + 0.5);
    }

    const playButton = document.getElementById('ball');
    playButton.addEventListener('click', function() {
        if(!audioCtx){
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            bBounce(300.0, 1.0, 200.0, 0.0);
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
            bBounce(300.0, 1.0, 200.0, 0.0);
        } else if (audioCtx.state === 'running') {
            audioCtx.suspend();
        } else {
        }
        
    }, false);
})