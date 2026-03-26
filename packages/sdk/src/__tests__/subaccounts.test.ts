import { describe, it, expect } from 'vitest';
import { ZendFiClient } from '../client';

describe('ZendFiClient subaccounts surface', () => {
  it('exposes subaccount lifecycle methods', () => {
    const client = new ZendFiClient({ apiKey: 'zfi_test_abc123' });

    expect(typeof client.createSubAccount).toBe('function');
    expect(typeof client.listSubAccounts).toBe('function');
    expect(typeof client.getSubAccount).toBe('function');
    expect(typeof client.getSubAccountBalance).toBe('function');
    expect(typeof client.mintSubAccountDelegationToken).toBe('function');
    expect(typeof client.freezeSubAccount).toBe('function');
    expect(typeof client.drainSubAccount).toBe('function');
    expect(typeof client.withdrawFromSubAccount).toBe('function');
    expect(typeof client.closeSubAccount).toBe('function');
  });
});
