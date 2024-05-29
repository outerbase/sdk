import { describe, expect, it, test } from '@jest/globals'
import { exec } from 'child_process'

describe('sync-database-models command', () => {
    it('should match the expected log output', (done) => {
        exec('npm exec sync-database-models', (error, stdout, stderr) => {
            if (error) {
                done(error);
                return;
            }
            
            const expectedLog = 'Generated models for tables: []';
            expect(stdout).toContain(expectedLog);
            done();
        });
    });
});