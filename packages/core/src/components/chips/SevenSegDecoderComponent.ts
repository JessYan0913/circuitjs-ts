import { ChipComponent, createPin, SIDE_W, SIDE_E } from '../base/ChipComponent.js';
import { registerComponent } from '../registry.js';

/** 7-Segment Decoder — BCD to 7-segment */
export class SevenSegDecoderComponent extends ChipComponent {
    getChipName(): string { return '7-Seg Dec'; }

    override setupPins(): void {
        this.sizeX = 2;
        this.sizeY = 4;
        this.pins = [
            createPin(0, SIDE_W, 'D0'),
            createPin(1, SIDE_W, 'D1'),
            createPin(2, SIDE_W, 'D2'),
            createPin(3, SIDE_W, 'D3'),
            createPin(0, SIDE_E, 'a'),
            createPin(1, SIDE_E, 'b'),
            createPin(2, SIDE_E, 'c'),
            createPin(3, SIDE_E, 'd'),
            createPin(4, SIDE_E, 'e'),
            createPin(5, SIDE_E, 'f'),
            createPin(6, SIDE_E, 'g'),
        ];
        for (let i = 4; i < 11; i++) {
            this.pins[i].output = true;
        }
    }

    override execute(): void {
        const d0 = this.pins[0].value ? 1 : 0;
        const d1 = this.pins[1].value ? 1 : 0;
        const d2 = this.pins[2].value ? 1 : 0;
        const d3 = this.pins[3].value ? 1 : 0;
        const val = d0 | (d1 << 1) | (d2 << 2) | (d3 << 3);

        // Standard 7-segment encoding: a,b,c,d,e,f,g
        //       a
        //     f   b
        //       g
        //     e   c
        //       d
        const segments: number[] = [
            0b0111111, // 0
            0b0000110, // 1
            0b1011011, // 2
            0b1001111, // 3
            0b1100110, // 4
            0b1101101, // 5
            0b1111101, // 6
            0b0000111, // 7
            0b1111111, // 8
            0b1101111, // 9
            0b1110111, // A
            0b1111100, // b
            0b0111001, // C
            0b1011110, // d
            0b1111001, // E
            0b1110001, // F
        ];
        const mask = val < segments.length ? segments[val] : 0;
        for (let i = 0; i < 7; i++) {
            this.pins[4 + i].value = (mask & (1 << (6 - i))) !== 0;
        }
    }

    override getDumpType(): number | string { return 197; }
}

registerComponent(197, 'SevenSegDecoderElm', SevenSegDecoderComponent);
