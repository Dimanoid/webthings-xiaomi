'use strict';

const { Adapter, Device, Property } = require('gateway-addon');
const { Hub, Devices } = require('./lib/Hub');

let ExampleAPIHandler = null;
// try {
//     ExampleAPIHandler = require('./example-api-handler');
// } catch (e) {
//     console.log(`API Handler unavailable: ${e}`);
//     // pass
// }

class ExampleProperty extends Property {
    constructor(device, name, propertyDescription) {
        super(device, name, propertyDescription);
        this.setCachedValue(propertyDescription.value);
        this.device.notifyPropertyChanged(this);
    }

    /**
     * Set the value of the property.
     *
     * @param {*} value The new value to set
     * @returns a promise which resolves to the updated value.
     *
     * @note it is possible that the updated value doesn't match
     * the value passed in.
     */
    setValue(value) {
        return new Promise((resolve, reject) => {
            super.setValue(value).then((updatedValue) => {
                resolve(updatedValue);
                this.device.notifyPropertyChanged(this);
            }).catch((err) => {
                reject(err);
            });
        });
    }
}

class XiaomiDevice extends Device {
    constructor(adapter, id, deviceDescription) {
        super(adapter, id);
        this.name = deviceDescription.name;
        this.type = deviceDescription.type;
        this['@type'] = deviceDescription['@type'];
        this.description = deviceDescription.description;
        for (const propertyName in deviceDescription.properties) {
            const propertyDescription = deviceDescription.properties[propertyName];
            const property = new ExampleProperty(this, propertyName,
                propertyDescription);
            this.properties.set(propertyName, property);
        }

        if (ExampleAPIHandler) {
            this.links.push({
                rel: 'alternate',
                mediaType: 'text/html',
                href: `/extensions/example-adapter?thingId=${encodeURIComponent(this.id)}`,
            });
        }
    }
}

class XiaomiAdapter extends Adapter {
    constructor(addonManager, manifest) {
        super(addonManager, 'XiaomiAdapter', manifest.name);

        addonManager.addAdapter(this);

        const cfg = manifest.moziot.config
        console.log('config:', cfg)
        if (!(cfg.port > 0 && cfg.address && cfg.token)) {
            console.warn('Wrong or empty config values.');
            return;
        }

        this.config = cfg;

        // if (ExampleAPIHandler) {
        //     this.apiHandler = new ExampleAPIHandler(addonManager, this);
        // }
    }

    startPairing(timeout) {
        console.log('startPairing, timeout:', timeout, this.config);
        if (!this.config) {
            console.warn('Wrong or empty config values.');
            return;
        }
        hub = new Hub({
            port: this.config.port,
            bind: this.config.address,
            key: this.config.token,
            keys: {},
            interval: 30000
        });

        hub.on('message', msg => {
            console.log('message: ' + JSON.stringify(msg));
        });

        hub.on('warning', msg => console.warn(msg));

        hub.on('error', error => {
            console.error(error);
        });

        hub.on('device', (device, name) => {
            console.log('NEW device: ', device);
            if (!this.devices[device.sid]) {
                const device = new XiaomiDevice(this, device.sid, {
                    name: name,
                    '@type': ['OnOffSwitch', 'SmartPlug'],
                    description: 'Example Device',
                    properties: {
                        on: {
                            '@type': 'OnOffProperty',
                            label: 'On/Off',
                            name: 'on',
                            type: 'boolean',
                            value: false,
                        },
                    },
                });

                this.handleDeviceAdded(device);
            }
        });

        hub.on('data', (sid, type, data) => {
            console.log('data: ' + sid + '(' + type + '): ' + JSON.stringify(data));
        });

        hub.listen();
    }

    cancelPairing() {
        console.log('XiaomiAdapter:', this.name, 'id', this.id, 'pairing cancelled');
    }

    /**
     * Unpair the provided the device from the adapter.
     *
     * @param {Object} device Device to unpair with
     */
    removeThing(device) {
        console.log('XiaomiAdapter:', this.name, 'id', this.id,
            'removeThing(', device.id, ') started');

        this.removeDevice(device.id).then(() => {
            console.log('XiaomiAdapter: device:', device.id, 'was unpaired.');
        }).catch((err) => {
            console.error('XiaomiAdapter: unpairing', device.id, 'failed');
            console.error(err);
        });
    }

    /**
     * Cancel unpairing process.
     *
     * @param {Object} device Device that is currently being paired
     */
    cancelRemoveThing(device) {
        console.log('XiaomiAdapter:', this.name, 'id', this.id,
            'cancelRemoveThing(', device.id, ')');
    }
}

module.exports = XiaomiAdapter;
