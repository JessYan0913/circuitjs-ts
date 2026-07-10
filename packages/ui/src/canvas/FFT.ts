/**
 * Cooley-Tukey radix-2 FFT implementation.
 * Computes the discrete Fourier transform of real-valued samples.
 */

/**
 * Compute the FFT of a real-valued signal.
 * The input length MUST be a power of 2.
 *
 * @returns real, imaginary, and magnitude arrays, each of length N/2 + 1
 *          (only the first Nyquist+1 bins are meaningful for real inputs)
 */
export function computeFFT(samples: Float64Array): {
    real: Float64Array;
    imag: Float64Array;
    magnitude: Float64Array;
} {
    const N = samples.length;

    // Bit-reversal permutation
    const real = new Float64Array(N);
    const imag = new Float64Array(N);

    for (let i = 0; i < N; i++) {
        const j = bitReverse(i, N);
        real[j] = samples[i];
        imag[j] = 0;
    }

    // Cooley-Tukey radix-2 decimation-in-time
    for (let len = 2; len <= N; len <<= 1) {
        const halfLen = len >>> 1;
        const angle = -2 * Math.PI / len;

        for (let i = 0; i < N; i += len) {
            for (let j = 0; j < halfLen; j++) {
                const wRe = Math.cos(angle * j);
                const wIm = Math.sin(angle * j);

                const evenIdx = i + j;
                const oddIdx = i + j + halfLen;

                const tRe = wRe * real[oddIdx] - wIm * imag[oddIdx];
                const tIm = wRe * imag[oddIdx] + wIm * real[oddIdx];

                real[oddIdx] = real[evenIdx] - tRe;
                imag[oddIdx] = imag[evenIdx] - tIm;
                real[evenIdx] = real[evenIdx] + tRe;
                imag[evenIdx] = imag[evenIdx] + tIm;
            }
        }
    }

    // Extract meaningful bins (0 to N/2 inclusive)
    const halfN = N >>> 1;
    const resultReal = new Float64Array(halfN + 1);
    const resultImag = new Float64Array(halfN + 1);
    const magnitude = new Float64Array(halfN + 1);

    for (let i = 0; i <= halfN; i++) {
        resultReal[i] = real[i];
        resultImag[i] = imag[i];
        magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / halfN;
    }

    return { real: resultReal, imag: resultImag, magnitude };
}

/**
 * Apply a Hann window to the samples to reduce spectral leakage.
 */
export function applyHannWindow(samples: Float64Array): Float64Array {
    const N = samples.length;
    const result = new Float64Array(N);
    for (let i = 0; i < N; i++) {
        result[i] = samples[i] * 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
    }
    return result;
}

/**
 * Get the frequency (in Hz) for a given FFT bin index.
 *
 * @param binIndex - The bin index (0 to N/2)
 * @param sampleRate - The sample rate of the input signal in Hz
 */
export function getFrequencyForBin(binIndex: number, sampleRate: number, fftSize: number): number {
    return (binIndex * sampleRate) / fftSize;
}

/**
 * Reverse the bits of a value for FFT bit-reversal permutation.
 */
function bitReverse(value: number, n: number): number {
    let result = 0;
    let bits = Math.log2(n);
    for (let i = 0; i < bits; i++) {
        result = (result << 1) | (value & 1);
        value >>>= 1;
    }
    return result;
}
