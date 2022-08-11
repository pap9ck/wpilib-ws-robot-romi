import LogUtil from "../../../../utils/logging/log-util";
import I2CPromisifiedBus from "../../../../device-interfaces/i2c/i2c-connection";
import { Mode1 } from "./pca9685-settings";

// PCA9685 Datasheet: https://www.nxp.com/docs/en/data-sheet/PCA9685.pdf

enum RegAddr {
    MODE1          = 0x00,
    PWM0_ON_L      = 0x06,
    PWM0_ON_H      = 0x07,
    PWM0_OFF_L     = 0x08,
    PWM0_OFF_H     = 0x09,
    PRE_SCALE      = 0xfe
}

const MODE1_BYTE: Map<Mode1, number> = new Map<Mode1, number>();
MODE1_BYTE.set(Mode1.RESTART, 0x80);
MODE1_BYTE.set(Mode1.SLEEP, 0x10);

const PRE_SCALE_50HZ = 0x7a; // Set 50 Hz PWM repetition (oscillator is 25MHz and 4096 ticks is one period)


function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

const logger = LogUtil.getLogger("PCA9685");

export default class PCA9685 {

    private _i2cBus: I2CPromisifiedBus;
    private _i2cAddress: number;

    private _isReady: boolean = false;

    constructor(bus: I2CPromisifiedBus, address: number) {
        this._i2cAddress = address;
        this._i2cBus = bus;
        this.init();
    }

    public init() {
        this._writeByte(RegAddr.MODE1,MODE1_BYTE.get(Mode1.RESTART) | MODE1_BYTE.get(Mode1.SLEEP));
        (async () => { 
            await delay(10);
        })();
        // set prescaler and default positions
        this._writeByte(RegAddr.PRE_SCALE,PRE_SCALE_50HZ);
        this._writeByte(RegAddr.PWM0_ON_L,0x00);                
        this._writeByte(RegAddr.PWM0_ON_H,0x00);                
        this._writeByte(RegAddr.PWM0_OFF_L,0x40);                
        this._writeByte(RegAddr.PWM0_OFF_H,0x01);                
        this._writeByte(RegAddr.PWM0_ON_L+4,0x00);                
        this._writeByte(RegAddr.PWM0_ON_H+4,0x00);                
        this._writeByte(RegAddr.PWM0_OFF_L+4,0x00);                
        this._writeByte(RegAddr.PWM0_OFF_H+4,0x01);                
        this._writeByte(RegAddr.PWM0_ON_L+8,0x00);                
        this._writeByte(RegAddr.PWM0_ON_H+8,0x00);                
        this._writeByte(RegAddr.PWM0_OFF_L+8,0x85);                
        this._writeByte(RegAddr.PWM0_OFF_H+8,0x01);                
        // clear sleep bit
        this._writeByte(RegAddr.MODE1,MODE1_BYTE.get(Mode1.RESTART));
        (async () => { 
            await delay(10);
        })();
        // restart
        this._writeByte(RegAddr.MODE1,MODE1_BYTE.get(Mode1.RESTART));
        logger.info("PCA9685 initialized");
        this._isReady = true;
    }
    

    public setPWMValue(channel: number, value: number): void {
        const pulsewidthLByte = value & 0xFF;
        const pulsewidthHByte = (value & 0xFF00) >> 8;    
        logger.info(`PWM value ${value}, LB ${pulsewidthLByte}, HB ${pulsewidthHByte}`);
        this._writeByte(RegAddr.PWM0_OFF_L+4*channel,pulsewidthLByte);                
        this._writeByte(RegAddr.PWM0_OFF_H+4*channel,pulsewidthHByte);                
    }


    private async _readByte(cmd: number): Promise<number> {
        return this._i2cBus.readByte(this._i2cAddress, cmd);
    }

    private async _writeByte(cmd: number, byte: number): Promise<void> {
        return this._i2cBus.writeByte(this._i2cAddress, cmd, byte);
    }

    private async _readWord(cmd: number): Promise<number> {
        return this._i2cBus.readWord(this._i2cAddress, cmd);
    }

    private async _sendByte(cmd: number): Promise<void> {
        return this._i2cBus.sendByte(this._i2cAddress, cmd);
    }

    private async _receiveByte(): Promise<number> {
        return this._i2cBus.receiveByte(this._i2cAddress);
    }

}
