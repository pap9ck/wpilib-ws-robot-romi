import { DigitalChannelMode } from "@wpilib/wpilib-ws-robot";
import LogUtil from "../../../../utils/logging/log-util";
import CustomDevice, { IOInterfaces, RobotHardwareInterfaces } from "../custom-device";
import PCA9685 from "../pca9685/pca9685"

export enum RomiArmPortModes {
    PWM = "PWM"
}

export interface RomiArmDeviceConfig {
    //portConfigs: RomiArmPortModes[];
}

const logger = LogUtil.getLogger("Romi Arm / PCA9685");

export default class RomiArmDevice extends CustomDevice {
    private _config: RomiArmDeviceConfig;

    private _numPWM: number = 3;

    private _pwmChannels: number[] = [0,1,2];

    private _lastUpdateTimeMs: number = 0;

    private _pca9685: PCA9685;

    constructor(robotHW: RobotHardwareInterfaces, config: RomiArmDeviceConfig) {
        super("RomiArmDevice", false, robotHW);

        // Set up the PCA9685 (custom add on HW PWM controller)
        this._pca9685 = new PCA9685(robotHW.i2cBus.rawBus, 0x40);
        logger.info("PCA9685 Initialized");
        this._config = config;
        this._setup();
    }

    public get ioInterfaces(): IOInterfaces {

        return {
            numPwmOutPorts: this._numPWM
        };
    }

    public update(): void {
        if (this._lastUpdateTimeMs === 0) {
            this._lastUpdateTimeMs = Date.now();
            return;
        }

        if (Date.now() - this._lastUpdateTimeMs > 500) {

            this._lastUpdateTimeMs = Date.now();
        }
    }

    private _setup() {
    }

    public setPWMValue(channel: number, value: number): void {
        let pca9685value;
        if (this._pwmChannels[channel] === undefined) {
            return;
        }
        // We get the value in the range 0-255 but the PCA9685
        // expects pulse width in ticks of 20ms/4096, also
        // the romi arm has limited servo movement within the arm
        // articulation. Below is the mapping which works in our case
        // but might have to be adapted. This moves this customization
        // to this web service which is not ideal, but it protects
        // the servos to move the arm beyond the limits if the main 
        // robot code has any issue. Also like this, the full servo range
        // in the robot code maps to the full arm (possible) range.
        if (channel === 0) {
            // gripper range mapping is 0 to 464 (close) and 255 to 96 (open)
            pca9685value = Math.floor(464 - 368/255*value);
        }
        if (channel === 1) {
            // arm lift range mapping is 0 to 320 (down) and 255 to 192 (up)
            pca9685value = Math.floor(320 - 128/255*value);
        }
        if (channel === 2) {
            // wrist lift range mapping is 0 to 389 (down) and 255 to 448 (up)
            pca9685value = Math.floor(350 + 100/255*value);
        }
        this._pca9685.setPWMValue(channel, pca9685value);
        logger.info(`Setting PWM port ${channel} (Physical pin ${this._pwmChannels[channel]}) value to ${value}`);
    }

}
