import { describe, expect, it, test } from '@jest/globals'
import { exec } from 'child_process'

describe('sync-remote-queries command', () => {
    it('should match the expected log output', (done) => {
        exec('npm exec sync-remote-queries', (error, stdout, stderr) => {
            if (error) {
                done(error);
                return;
            }
            
            const expectedLog = 'Queries generated successfully';
            expect(stdout).toContain(expectedLog);
            done();
        });
    });
});