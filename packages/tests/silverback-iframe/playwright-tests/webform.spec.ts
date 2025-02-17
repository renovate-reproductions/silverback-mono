import {
  drupal,
  drupalLogin,
  drupalLogout,
  gatsby,
  resetState,
  waitForGatsby,
} from '@amazeelabs/silverback-playwright';
import { expect, PlaywrightTestArgs, test } from '@playwright/test';
import { $, cd } from 'zx';

import { getIframe } from './common';

test.beforeAll(async () => {
  await resetState();
});

test('@drupal-only the unsupported confirmation type is replaced with the default value', async ({
  page,
}) => {
  cd(drupal.path);
  const result =
    await $`source .envrc && drush cget webform.webform.for_testing_confirmation_options settings.confirmation_type --include-overridden --format=json`;
  const confirmationType = Object.values(JSON.parse(result.stdout))[0];
  expect(confirmationType).toEqual('page');

  await drupalLogin(page);
  await page.goto(
    `${drupal.baseUrl}/en/admin/structure/webform/manage/for_testing_confirmation_options/settings/confirmation`,
  );
  await expect(
    page.locator('input[name="confirmation_type"][value="inline"]'),
  ).toBeChecked();
});

test('@drupal-only only allowed confirmation types are listed in the webform config', async ({
  page,
}) => {
  const getOptions = async () => {
    await page.goto(
      `${drupal.baseUrl}/en/admin/structure/webform/manage/for_testing_confirmation_options/settings/confirmation`,
    );
    return Promise.all(
      (
        await page.$$('input[name="confirmation_type"]')
      ).map((option) => option.getAttribute('value')),
    );
  }

  await drupalLogin(page);

  // Case: limit_webform_confirmation_options is FALSE.
  // Can't use "drush cset" due to https://github.com/drush-ops/drush/issues/3793
  await $`source .envrc && drush eval '\\Drupal::configFactory()->getEditable("silverback_iframe.settings")->set("limit_webform_confirmation_options", FALSE)->save();'`;
  expect(await getOptions()).not.toEqual(confirmationOptions);

  // Case: limit_webform_confirmation_options is TRUE.
  await $`source .envrc && drush -y cset silverback_iframe.settings limit_webform_confirmation_options true --input-format=yaml`;
  expect(await getOptions()).toEqual(confirmationOptions);

  // Case: limit_webform_confirmation_options is missing.
  await $`source .envrc && drush -y cdel silverback_iframe.settings`;
  expect(await getOptions()).toEqual(confirmationOptions);
});

test('@gatsby-both confirmation type: inline', async ({ page }) => {
  await setConfirmationOption(page, 'inline', { addMessage: true });
  await submitWebform(page);

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    'Test message with&nbsp;<strong>some bold text.</strong>',
  );
  expect(await page.$('iframe')).toBeNull();
});

test('@gatsby-both confirmation type: message', async ({ page }) => {
  await setConfirmationOption(page, 'message', { addMessage: true });
  await submitWebform(page);

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    'Test message with&nbsp;<strong>some bold text.</strong>',
  );
  expect(await page.$('iframe')).not.toBeNull();
});

test('@gatsby-both confirmation type: url', async ({ page }) => {
  await setConfirmationOption(page, 'url', {
    setRedirectUrl: '/en/article/with-everything',
  });
  await submitWebform(page);
  await page.waitForNavigation();

  expect(page.url()).toBe(
    // It's important to ensure that we are redirected to Gatsby, not to Drupal.
    `${gatsby.baseUrl}/en/article/with-everything`,
  );
});

test('@gatsby-both confirmation type: url_message', async ({ page }) => {
  await setConfirmationOption(page, 'url_message', {
    addMessage: true,
    setRedirectUrl: '/en/article/other',
  });
  await submitWebform(page);
  await page.waitForNavigation();

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    'Test message with&nbsp;<strong>some bold text.</strong>',
  );
  expect(page.url()).toBe(
    // It's important to ensure that we are redirected to Gatsby, not to Drupal.
    `${gatsby.baseUrl}/en/article/other`,
  );
});

test('@gatsby-both confirmation type: none', async ({ page }) => {
  await setConfirmationOption(page, 'none');
  await submitWebform(page);

  expect(await page.$('iframe')).not.toBeNull();
  expect(await page.$('.status-messages-inner')).toBeNull();
});

test('@gatsby-both confirmation type: message with fallback', async ({
  page,
}) => {
  await setConfirmationOption(page, 'message', {
    addMessage:
      '<span class="hidden js-iframe-parent-message">The contact form has been submitted</span><div>You will be redirected back to the <a class="js-iframe-parent-redirect" href="/article/other">form</a>.</div>',
  });
  await submitWebform(page);
  await page.waitForNavigation();

  expect(await page.innerHTML('.status-messages-inner')).toContain(
    'The contact form has been submitted',
  );
  expect(page.url()).toBe(
    // It's important to ensure that we are redirected to Gatsby, not to Drupal.
    `${gatsby.baseUrl}/en/article/other`,
  );
});

const confirmationOptions = [
  'inline',
  'message',
  'url',
  'url_message',
  'none',
] as const;
type ConfirmationOption = typeof confirmationOptions[number];

const setConfirmationOption = async (
  page: PlaywrightTestArgs['page'],
  confirmationOption: ConfirmationOption,
  options?: {
    addMessage?: boolean | string;
    setRedirectUrl?: string;
  },
) => {
  await drupalLogin(page);
  await page.goto(
    `${drupal.baseUrl}/en/admin/structure/webform/manage/for_testing_confirmation_options/settings/confirmation`,
  );

  await page.click(
    `input[name="confirmation_type"][value="${confirmationOption}"]`,
  );

  if (options?.addMessage === true) {
    const editorFrame = (await (
      await page.waitForSelector(
        '.form-item--confirmation-message-value .cke_wysiwyg_frame',
      )
    )?.contentFrame())!;
    // Filling with an empty string helps Playwright do the things right.
    await editorFrame.fill('body', '');
    await editorFrame.fill('body', 'Test message with ');
    await page.click(
      '.form-item--confirmation-message-value .cke_button__bold',
    );
    await page.keyboard.type('some bold text.');
  }
  if (typeof options?.addMessage === 'string') {
    await page.click('a[role="button"]:has-text("Source")');
    await page.fill('#cke_1_contents div textarea', options.addMessage);
  }

  if (options?.setRedirectUrl) {
    await page.fill('input[name=confirmation_url]', options.setRedirectUrl);
  }

  await page.click('text=Save');
  await waitForGatsby();
  await drupalLogout(page);
};

const submitWebform = async (page: PlaywrightTestArgs['page']) => {
  await page.goto(`${gatsby.baseUrl}/en/form/for-testing-confirmation-options`);
  const iframe = await getIframe(page);
  await iframe.click('text=Submit');
};
