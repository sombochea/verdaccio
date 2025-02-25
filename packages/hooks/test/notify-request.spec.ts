import { MockAgent, setGlobalDispatcher } from 'undici';

import { createRemoteUser, parseConfigFile } from '@verdaccio/config';
import { setup } from '@verdaccio/logger';
import { Config } from '@verdaccio/types';

import { notify } from '../src/notify';
import { parseConfigurationFile } from './__helper';

const parseConfigurationNotifyFile = (name) => {
  return parseConfigurationFile(`notify/${name}`);
};
const singleHeaderNotificationConfig = parseConfigFile(
  parseConfigurationNotifyFile('single.header.notify')
);
const multiNotificationConfig = parseConfigFile(parseConfigurationNotifyFile('multiple.notify'));

setup({});

const domain = 'http://slack-service';

const options = {
  path: '/foo?auth_token=mySecretToken',
  method: 'POST',
};

describe('Notifications:: notifyRequest', () => {
  test('when sending a empty notification', async () => {
    const mockAgent = new MockAgent({ connections: 1 });
    setGlobalDispatcher(mockAgent);
    const mockClient = mockAgent.get(domain);
    mockClient.intercept(options).reply(200, { body: 'test' });

    const notificationResponse = await notify({}, {}, createRemoteUser('foo', []), 'bar');
    expect(notificationResponse).toEqual([false]);
  });

  test('when sending a single notification', async () => {
    const mockAgent = new MockAgent({ connections: 1 });
    setGlobalDispatcher(mockAgent);
    const mockClient = mockAgent.get(domain);
    mockClient.intercept(options).reply(200, { body: 'test' });

    const notificationResponse = await notify(
      {},
      singleHeaderNotificationConfig,
      createRemoteUser('foo', []),
      'bar'
    );
    expect(notificationResponse).toEqual([true]);
    await mockClient.close();
  });

  test('when notification endpoint is missing', async () => {
    const mockAgent = new MockAgent({ connections: 1 });
    setGlobalDispatcher(mockAgent);
    const mockClient = mockAgent.get(domain);
    mockClient.intercept(options).reply(200, { body: 'test' });
    const name = 'package';
    const config: Partial<Config> = {
      // @ts-ignore
      notify: {
        method: 'POST',
        endpoint: undefined,
        content: '',
      },
    };
    const notificationResponse = await notify({ name }, config, createRemoteUser('foo', []), 'bar');
    expect(notificationResponse).toEqual([false]);
  });

  test('when multiple notifications', async () => {
    const mockAgent = new MockAgent({ connections: 1 });
    setGlobalDispatcher(mockAgent);
    const mockClient = mockAgent.get(domain);
    mockClient.intercept(options).reply(200, { body: 'test' });
    mockClient.intercept(options).reply(400, {});
    mockClient.intercept(options).reply(500, { message: 'Something bad happened' });

    const name = 'package';
    const responses = await notify({ name }, multiNotificationConfig, { name: 'foo' }, 'bar');
    expect(responses).toEqual([true, false, false]);
    await mockClient.close();
  });
});
