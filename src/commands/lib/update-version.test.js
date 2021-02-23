const { MINOR, PATCH } = require('./consts');
const { update, getWildCards } = require('./update-version');

describe('wild-cards', () => {
    describe('getWildCards', () => {
        describe('default', () => {
            it('returns false when there are no wild cards', async () => {
                expect(getWildCards('0.0.0')).toEqual({
                    isWildMinor: false,
                    isWildPatch: false,
                });
            });
        });
        describe('patch', () => {
            it('returns isWildPatch:true when there is ~', async () => {
                expect(getWildCards('~0.0.0')).toEqual({
                    isWildMinor: false,
                    isWildPatch: true,
                });
            });
            it('returns isWildPatch:true when there is x in te patch', async () => {
                expect(getWildCards('0.0.x')).toEqual({
                    isWildMinor: false,
                    isWildPatch: true,
                });
            });
        });
        describe('minor', () => {
            it('returns isWildMinor:true when there is ~', async () => {
                expect(getWildCards('^0.0.0')).toEqual({
                    isWildMinor: true,
                    isWildPatch: false,
                });
            });
            it('returns isWildMinor:true when there is x in te patch', async () => {
                expect(getWildCards('0.x')).toEqual({
                    isWildMinor: true,
                    isWildPatch: false,
                });
            });
        });
    });
    describe('update', () => {
        describe('wild patches', () => {
            it('return latestVersion when there is nothing to replace', () => {
                const version = '1.1.1';
                const latestVersion = '1.1.2';
                expect(update({ version, latestVersion })).toEqual({ newVersion: '1.1.2', semVerChange: PATCH });
            });

            it('returns null since no change is needed for a version with a patch wild and only patch update', () => {
                const version = '1.1.x';
                const latestVersion = '1.1.2';
                expect(update({ version, latestVersion })).toBeNull();
            });

            it('return latestVersion with a patch wild and minor update', () => {
                const version = '1.1.x';
                const latestVersion = '1.2.2';
                expect(update({ version, latestVersion })).toEqual({ newVersion: '1.2.x', semVerChange: MINOR });
            });

            it('return null since no change is needed for a patch tilda and patch update', () => {
                const version = '~1.1.1';
                const latestVersion = '1.1.2';
                expect(update({ version, latestVersion })).toBeNull();
            });

            it('return latestVersion with a patch tilda and minor update', () => {
                const version = '~1.1.1';
                const latestVersion = '1.2.2';
                expect(update({ version, latestVersion })).toEqual({ newVersion: '~1.2.2', semVerChange: MINOR });
            });
        });

        describe('wild minors', () => {
            it('return latestVersion when there is nothing to replace', () => {
                const version = '1.1.1';
                const latestVersion = '1.2.2';
                expect(update({ version, latestVersion })).toEqual({ newVersion: '1.2.2', semVerChange: MINOR });
            });

            it('return null since no change is needed for  with a minor wild', () => {
                const version = '1.x.x';
                const latestVersion = '1.2.2';
                expect(update({ version, latestVersion })).toBeNull();
            });

            it('return null since no change is needed for a minor hat', () => {
                const version = '^1.1.1';
                const latestVersion = '1.2.2';
                expect(update({ version, latestVersion })).toBeNull();
            });

            it('return null since no change is needed for a minor hat and a patch update', () => {
                const version = '^1.1.1';
                const latestVersion = '1.1.2';
                expect(update({ version, latestVersion })).toBeNull();
            });
        });
    });
});
