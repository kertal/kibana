/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const config = getService('config');
  const PageObjects = getPageObjects([
    'common',
    'error',
    'visualize',
    'header',
    'security',
    'share',
    'spaceSelector',
    'timePicker',
  ]);
  const testSubjects = getService('testSubjects');
  const appsMenu = getService('appsMenu');
  const globalNav = getService('globalNav');
  const queryBar = getService('queryBar');
  const savedQueryManagementComponent = getService('savedQueryManagementComponent');

  describe('feature controls security', () => {
    before(async () => {
      await esArchiver.load('visualize/default');
      await esArchiver.loadIfNeeded('logstash_functional');
    });

    after(async () => {
      await esArchiver.unload('visualize/default');
    });

    describe('global visualize all privileges', () => {
      before(async () => {
        await security.role.create('global_visualize_all_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_visualize_all_user', {
          password: 'global_visualize_all_user-password',
          roles: ['global_visualize_all_role'],
          full_name: 'test user',
        });

        await PageObjects.security.forceLogout();

        await PageObjects.security.login(
          'global_visualize_all_user',
          'global_visualize_all_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await security.role.delete('global_visualize_all_role');
        await security.user.delete('global_visualize_all_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Visualize');
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizeLandingPage', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`doesn't show read-only badge`, async () => {
        await globalNav.badgeMissingOrFail();
      });

      it(`can view existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('can save existing Visualization', async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizeSaveButton', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it('Embed code shows create short-url button', async () => {
        await PageObjects.share.openShareMenuItem('Embedcode');
        await PageObjects.share.createShortUrlExistOrFail();
      });

      it('Permalinks shows create short-url button', async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlExistOrFail();
        // close menu
        await PageObjects.share.clickShareTopNavButton();
      });

      // Flaky: https://github.com/elastic/kibana/issues/50018
      it.skip('allow saving via the saved query management component popover with no saved query loaded', async () => {
        await queryBar.setQuery('response:200');
        await savedQueryManagementComponent.saveNewQuery('foo', 'bar', true, false);
        await savedQueryManagementComponent.savedQueryExistOrFail('foo');
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
      });

      // Depends on skipped test above
      it.skip('allow saving a currently loaded saved query as a new query via the saved query management component ', async () => {
        await savedQueryManagementComponent.saveCurrentlyLoadedAsNewQuery(
          'foo2',
          'bar2',
          true,
          false
        );
        await savedQueryManagementComponent.savedQueryExistOrFail('foo2');
        await savedQueryManagementComponent.closeSavedQueryManagementComponent();
      });

      // Depends on skipped test above
      it.skip('allow saving changes to a currently loaded query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('foo2');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQuery('bar2', false, false);
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
        await savedQueryManagementComponent.loadSavedQuery('foo2');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:404');
      });

      // Depends on skipped test above
      it.skip('allows deleting saved queries in the saved query management component ', async () => {
        await savedQueryManagementComponent.deleteSavedQuery('foo2');
        await savedQueryManagementComponent.savedQueryMissingOrFail('foo2');
      });
    });

    describe('global visualize read-only privileges', () => {
      before(async () => {
        await security.role.create('global_visualize_read_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['read'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_visualize_read_user', {
          password: 'global_visualize_read_user-password',
          roles: ['global_visualize_read_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_visualize_read_user',
          'global_visualize_read_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await security.role.delete('global_visualize_read_role');
        await security.user.delete('global_visualize_read_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Visualize');
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizeLandingPage', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`can view existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it(`can't save existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('shareTopNavButton', {
          timeout: config.get('timeouts.waitFor'),
        });
        await testSubjects.missingOrFail('visualizeSaveButton', {
          timeout: config.get('timeouts.waitFor'),
        });
      });

      it(`Embed Code doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Embedcode');
        await PageObjects.share.createShortUrlMissingOrFail();
      });

      it(`Permalinks doesn't show create short-url button`, async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlMissingOrFail();
        // close the menu
        await PageObjects.share.clickShareTopNavButton();
      });

      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    });

    describe('global visualize read-only with url_create privileges', () => {
      before(async () => {
        await security.role.create('global_visualize_read_url_create_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                visualize: ['read', 'url_create'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('global_visualize_read_url_create_user', {
          password: 'global_visualize_read_url_create_user-password',
          roles: ['global_visualize_read_url_create_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'global_visualize_read_url_create_user',
          'global_visualize_read_url_create_user-password',
          {
            expectSpaceSelector: false,
          }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await security.role.delete('global_visualize_read_url_create_role');
        await security.user.delete('global_visualize_read_url_create_user');
      });

      it('shows visualize navlink', async () => {
        const navLinks = (await appsMenu.readLinks()).map((link) => link.text);
        expect(navLinks).to.contain('Visualize');
      });

      it(`landing page shows "Create new Visualization" button`, async () => {
        await PageObjects.visualize.gotoVisualizationLandingPage();
        await testSubjects.existOrFail('visualizeLandingPage', { timeout: 10000 });
        await testSubjects.existOrFail('newItemButton');
      });

      it(`shows read-only badge`, async () => {
        await globalNav.badgeExistsOrFail('Read only');
      });

      it(`can view existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('visualizationLoader', { timeout: 10000 });
      });

      it(`can't save existing Visualization`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await testSubjects.existOrFail('shareTopNavButton', { timeout: 10000 });
        await testSubjects.missingOrFail('visualizeSaveButton', { timeout: 10000 });
      });

      it('Embed code shows create short-url button', async () => {
        await PageObjects.share.openShareMenuItem('Embedcode');
        await PageObjects.share.createShortUrlExistOrFail();
      });

      it('Permalinks shows create short-url button', async () => {
        await PageObjects.share.openShareMenuItem('Permalinks');
        await PageObjects.share.createShortUrlExistOrFail();
        // close menu
        await PageObjects.share.clickShareTopNavButton();
      });

      it('allows loading a saved query via the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        const queryString = await queryBar.getQueryString();
        expect(queryString).to.eql('response:200');
      });

      it('does not allow saving via the saved query management component popover with no query loaded', async () => {
        await savedQueryManagementComponent.saveNewQueryMissingOrFail();
      });

      it('does not allow saving changes to saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await queryBar.setQuery('response:404');
        await savedQueryManagementComponent.updateCurrentlyLoadedQueryMissingOrFail();
      });

      it('does not allow deleting a saved query from the saved query management component', async () => {
        await savedQueryManagementComponent.deleteSavedQueryMissingOrFail('OKJpgs');
      });

      it('allows clearing the currently loaded saved query', async () => {
        await savedQueryManagementComponent.loadSavedQuery('OKJpgs');
        await savedQueryManagementComponent.clearCurrentlyLoadedQuery();
      });
    });

    describe('no visualize privileges', () => {
      before(async () => {
        await security.role.create('no_visualize_privileges_role', {
          elasticsearch: {
            indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
          },
          kibana: [
            {
              feature: {
                discover: ['all'],
              },
              spaces: ['*'],
            },
          ],
        });

        await security.user.create('no_visualize_privileges_user', {
          password: 'no_visualize_privileges_user-password',
          roles: ['no_visualize_privileges_role'],
          full_name: 'test user',
        });

        await PageObjects.security.login(
          'no_visualize_privileges_user',
          'no_visualize_privileges_user-password',
          { expectSpaceSelector: false }
        );
      });

      after(async () => {
        await PageObjects.security.forceLogout();
        await security.role.delete('no_visualize_privileges_role');
        await security.user.delete('no_visualize_privileges_user');
      });

      it(`landing page shows 404`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.error.expectNotFound();
      });

      it(`edit page shows 404`, async () => {
        await PageObjects.common.navigateToActualUrl('visualize', '/edit/i-exist', {
          ensureCurrentUrl: false,
          shouldLoginIfPrompted: false,
        });
        await PageObjects.error.expectNotFound();
      });
    });
  });
}
