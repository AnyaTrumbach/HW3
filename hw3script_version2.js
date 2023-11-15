//wait for page to load
document.addEventListener("DOMContentLoaded", function(event){
    var audioCtx = null;
    activeNodes = {};

    var analyser;
    var canvasCtx = document.getElementById("visualizer").getContext("2d");
    var dataArray;
    var WIDTH = 800;
    var HEIGHT = 300;
    var bufferLength = 1;
    var fix = false;

    const checkFix = document.getElementById('fix');
    checkFix.addEventListener('change', function() {
        fix = checkFix.checked;
    }, false);

    // start with brownNoise
    function bNoise(){
        var bufferSize = 10 * audioCtx.sampleRate,
        noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate),
        output = noiseBuffer.getChannelData(0);

        console.log(fix);

        // The following "fix" code comes from https://noisehack.com/generate-noise-web-audio-api/
        // I attempted to implement to -3dB/octave filters consecutively as suggested here https://www.renesas.com/us/en/document/apn/cm-351-true-white-noise-generator-pink-and-brown-noise-outputs
        // to make brown noise that falls 6dB/octave like the supercollider brown noise as opposed to the example code
        // which falls 12dB/octave
        // Audacity Spectrum Analysis did not confirm the validity of this method.

        if (fix === true){
            var b0, b1, b2, b3, b4, b5, b6;
            b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
            for (var i = 0; i < bufferSize; i++) {
                var white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                output[i] *= 0.11;
                b6 = white * 0.115926;
            }
            for (var i = 0; i < bufferSize; i++) {
                var white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                output[i] *= 0.11;
                b6 = white * 0.115926;
            }
            //*/
        } else {
            var lastOut = 0;
            for (var i = 0; i < bufferSize; i++) {
                var white = Math.random() * 2 - 1;
                output[i] = (lastOut + (0.02 * white)) / 1.04;
                lastOut = output[i];
                output[i] *= 3.5;
            }
        }
    
        brownNoise = audioCtx.createBufferSource();
        brownNoise.buffer = noiseBuffer;
        brownNoise.loop = true;
        brownNoise.start();

        return brownNoise;
    }

    //from supercollider --> in, cutoff, mult, add
    // biquad --> lowpass filter with frequency cutoff specified
    function low(cutoff) {
        //input should be brown noise
        input = bNoise();
    
        biquadFilter = audioCtx.createBiquadFilter();
    
        biquadFilter.type = "lowpass";
        biquadFilter.frequency.value = cutoff;
    
        input.connect(biquadFilter)
        return biquadFilter;
    }
    // from supercollider ---> in, freq, rq, mult, add
    function RHPF() {
        //input should be brown noise lowpass filtered at 400 Hz;
        input = low(400);

        biquadFilterRHPF = audioCtx.createBiquadFilter();
        biquadFilterRHPF.type = "bandpass";
        biquadFilterRHPF.frequency = 500; //frequency starts at 500

        // rphf frequency should be brown noise filtered at 14 Hz * 400
        freq = low(14);
        console.log(freq);
        freqMult = audioCtx.createGain();
        freqMult.gain.setValueAtTime(400, audioCtx.currentTime);
        freq.connect(freqMult).connect(biquadFilterRHPF.frequency); // frequency oscillates around 500

        //set Q value from superCollider function 1/0.03
        biquadFilterRHPF.Q = 33.33;
    
        input.connect(biquadFilterRHPF)

        // multiplication from the last value in the superCOllider function
        gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        biquadFilterRHPF.connect(gainNode)

        if (fix === true){
            //idea: cascaded filters improves effectiviness, increases steepness in transition band
            biquadFilterHigh = audioCtx.createBiquadFilter();
            biquadFilterHigh.type = "lowpass";
            biquadFilterHigh.frequency = 400;
            gainNode.connect(biquadFilterHigh);
            lastNode = biquadFilterHigh;
        } else {
            lastNode = gainNode
        }

        lastNode.connect(audioCtx.destination);

        analyser = audioCtx.createAnalyser();
        gainNode.connect(analyser).connect(audioCtx.destination);
        analyser.fftSize = 2048;
        bufferLength = analyser.frequencyBinCount;
        console.log(bufferLength);
        dataArray = new Uint8Array(bufferLength);

        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        draw();

        return gainNode;
    }

    const playButton = document.querySelector('button');
    playButton.addEventListener('click', function() {
        if(!audioCtx){
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            RHPF();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
            RHPF();
        } else if (audioCtx.state === 'running') {
            audioCtx.suspend();
        } else {}
        
    }, false);

    function draw() {
        drawVisual = requestAnimationFrame(draw);
    
        analyser.getByteFrequencyData(dataArray);
    
        canvasCtx.fillStyle = 'rgb(0, 0, 0)';
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    
        var barWidth = (WIDTH / bufferLength) * 2.5;
        var barHeight;
        var x = 0;
    
        for (var i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 2;
    
            canvasCtx.fillStyle = 'rgb(' + (barHeight + 100) + ',50,50)';
            canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight);
    
            x += barWidth + 1;
        }
    };

})