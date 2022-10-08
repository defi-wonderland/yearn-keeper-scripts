import process from 'node:process';
import type {UnsubscribeFunction} from '@keep3r-network/keeper-scripting-utils';
import type {Address} from './types';

export function getEnvVariable(name: string): string {
  const value: string | undefined = process.env[name];
  if (!value) throw new Error(`Environment variable ${name} not found`);
  return value;
}

export function stopSubscription(storage: Record<string, UnsubscribeFunction>, strategy: Address): void {
  if (storage[strategy]) {
    storage[strategy]();
    delete storage[strategy];
  }
}
