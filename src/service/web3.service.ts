import { inject, injectable } from 'inversify';
import web3 = require('web3');

import { config } from '../config';
import { TYPES } from '../constant/types';
import { AuthenticationError, ValidationError } from '../error';
import { ILogger } from '../interface/logger.inferface';
import { matchHexOfLength } from '../util/helpers';

@injectable()
export class Web3Service {
  private web3;
  private w3Account;
  private privateKey = config.web3.privateKey;
  constructor(@inject(TYPES.LoggerService) public logger: ILogger) {
    if (!matchHexOfLength(this.privateKey, 64)) {
      throw new ValidationError('Invalid private key format');
    }

    this.web3 = new web3();
    this.w3Account = this.web3.eth.accounts.privateKeyToAccount(this.privateKey);
    this.web3.eth.accounts.wallet.add(this.w3Account);
    this.web3.eth.defaultAccount = this.w3Account.address;
    this.web3.setProvider(config.web3.rpc);
  }

  public sign(data) {
    const { signature } = this.web3.eth.accounts.sign(
      this.serializeForHashing(data),
      this.privateKey
    );

    return signature;
  }

  public addressFromSecret(secret) {
    try {
      return this.web3.eth.accounts.privateKeyToAccount(secret).address;
    } catch (_e) {
      throw new AuthenticationError('Invalid secret.');
    }
  }

  public validateSignature(address, signature, data): boolean {
    if (!matchHexOfLength(address, 40)) {
      return false;
    }
    if (!matchHexOfLength(signature, 130)) {
      return false;
    }
    const signer = this.web3.eth.accounts.recover(this.serializeForHashing(data), signature);

    if (address.toLowerCase() !== signer.toLowerCase()) {
      return false;
    }
    return true;
  }

  public serializeForHashing(object) {
    const isDict = subject => typeof subject === 'object' && !Array.isArray(subject);
    const isString = subject => typeof subject === 'string';
    const isArray = subject => Array.isArray(subject);

    if (isDict(object)) {
      const content = Object.keys(object)
        .sort()
        .map(key => `"${key}":${this.serializeForHashing(object[key])}`)
        .join(',');

      return `{${content}}`;
    }
    if (isArray(object)) {
      const content = object.map(item => this.serializeForHashing(item)).join(',');

      return `[${content}]`;
    }
    if (isString(object)) {
      return `"${object}"`;
    }
    return object.toString();
  }
}
