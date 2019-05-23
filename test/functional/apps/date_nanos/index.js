/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'timePicker', 'discover']);
  const kibanaServer = getService('kibanaServer');
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  describe('date_nanos', function () {
    this.tags('ciGroup1');

    before(function () {
      return browser.setWindowSize(1300, 800);
    });

    after(function unloadMakelogs() {
      return esArchiver.unload('date_nanos');
    });

    describe('discover', function () {
      before(async function () {
        await esArchiver.loadIfNeeded('date_nanos');
        await kibanaServer.uiSettings.replace({ 'defaultIndex': 'logstash-*' });
        await PageObjects.common.navigateToApp('discover');
        await PageObjects.timePicker.setAbsoluteRange(fromTime, toTime);
      });
      it('should show a timestamp with nanoseconds in the first result row', async function () {
        const time = await PageObjects.timePicker.getTimeConfig();
        expect(time.start).to.be('Sep 19, 2015 @ 06:31:44.000');
        expect(time.end).to.be('Sep 23, 2015 @ 18:31:44.000');
        const rowData = await PageObjects.discover.getDocTableIndex(1);
        expect(rowData.startsWith('Sep 22, 2015 @ 23:50:13.253123345')).to.be.ok();
      });
    });
  });

}
