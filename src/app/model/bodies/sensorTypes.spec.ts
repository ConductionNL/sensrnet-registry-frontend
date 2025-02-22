import { getSensorTypesTranslation } from './sensorTypes';

describe('sensorTypes default translation', () => {
    let types = getSensorTypesTranslation();

    it('should instantiate with EN by default', () => {
        testInstanceExists(types);
    });

    it('should return [Sound sensor] as first key for EN by default', () => {
        expect(types[0].key).toBe('Sound sensor');
        expect(types[0].value).toBe('Sound sensor');
    })
});

describe('sensorTypes EN translation', () => {
    let types = getSensorTypesTranslation('en');

    it('should instantiate with EN', () => {
        testInstanceExists(types);
    });

    it('should return [Sound sensor] as first key for EN', () => {
        expect(types[0].key).toBe('Sound sensor');
        expect(types[0].value).toBe('Sound sensor');
    })
});

describe('sensorTypes NL translation', () => {
    let types = getSensorTypesTranslation('nl');

    it('should instantiate with NL', () => {
        testInstanceExists(types);
    });

    it('should return [Sound sensor] as first key for NL', () => {
        expect(types[0].key).toBe('Sound sensor');
        expect(types[0].value).toBe('Geluidsensor');
    })
});

function testInstanceExists(types: Object) {
    expect(types).toBeTruthy();
}