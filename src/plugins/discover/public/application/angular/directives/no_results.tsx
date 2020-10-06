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

import React, { Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

import {
  EuiButton,
  EuiCallOut,
  EuiCode,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { getServices } from '../../../kibana_services';
import { DataPublicPluginStart } from '../../../../../data/public';

export function DiscoverNoResults({
  timeFieldName,
  queryLanguage,
  error,
  data,
}: {
  timeFieldName: string;
  queryLanguage: string;
  error: Error;
  data: DataPublicPluginStart;
}) {
  let timeFieldMessage;

  if (timeFieldName && !error) {
    timeFieldMessage = (
      <Fragment>
        <EuiSpacer size="xl" />

        <EuiText>
          <h2 data-test-subj="discoverNoResultsTimefilter">
            <FormattedMessage
              id="discover.noResults.expandYourTimeRangeTitle"
              defaultMessage="Expand your time range"
            />
          </h2>

          <p>
            <FormattedMessage
              id="discover.noResults.queryMayNotMatchTitle"
              defaultMessage="One or more of the indices you&rsquo;re looking at contains a date field. Your query may
                  not match anything in the current time range, or there may not be any data at all in
                  the currently selected time range. You can try changing the time range to one which contains data."
            />
          </p>
        </EuiText>
      </Fragment>
    );
  }

  let luceneQueryMessage;

  if (queryLanguage === 'lucene' && !error) {
    const searchExamples = [
      {
        description: <EuiCode>200</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="discover.noResults.searchExamples.anyField200StatusCodeExampleTitle"
                defaultMessage="Find requests that contain the number 200, in any field"
              />
            </strong>
          </EuiText>
        ),
      },
      {
        description: <EuiCode>status:200</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="discover.noResults.searchExamples.statusField200StatusCodeExampleTitle"
                defaultMessage="Find 200 in the status field"
              />
            </strong>
          </EuiText>
        ),
      },
      {
        description: <EuiCode>status:[400 TO 499]</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="discover.noResults.searchExamples.400to499StatusCodeExampleTitle"
                defaultMessage="Find all status codes between 400-499"
              />
            </strong>
          </EuiText>
        ),
      },
      {
        description: <EuiCode>status:[400 TO 499] AND extension:PHP</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="discover.noResults.searchExamples.400to499StatusCodeWithPhpExtensionExampleTitle"
                defaultMessage="Find status codes 400-499 with the extension php"
              />
            </strong>
          </EuiText>
        ),
      },
      {
        description: <EuiCode>status:[400 TO 499] AND (extension:php OR extension:html)</EuiCode>,
        title: (
          <EuiText>
            <strong>
              <FormattedMessage
                id="discover.noResults.searchExamples.400to499StatusCodeWithPhpOrHtmlExtensionExampleTitle"
                defaultMessage="Find status codes 400-499 with the extension php or html"
              />
            </strong>
          </EuiText>
        ),
      },
    ];

    luceneQueryMessage = (
      <Fragment>
        <EuiSpacer size="xl" />

        <EuiText>
          <h3>
            <FormattedMessage
              id="discover.noResults.searchExamples.refineYourQueryTitle"
              defaultMessage="Refine your query"
            />
          </h3>

          <p>
            <FormattedMessage
              id="discover.noResults.searchExamples.howTosearchForWebServerLogsDescription"
              defaultMessage="The search bar at the top uses Elasticsearch&rsquo;s support for Lucene {queryStringSyntaxLink}.
                Here are some examples of how you can search for web server logs that have been parsed into a few fields."
              values={{
                queryStringSyntaxLink: (
                  <EuiLink
                    target="_blank"
                    href={getServices().docLinks.links.query.luceneQuerySyntax}
                  >
                    <FormattedMessage
                      id="discover.noResults.searchExamples.queryStringSyntaxLinkText"
                      defaultMessage="Query String syntax"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiDescriptionList type="column" listItems={searchExamples} />

        <EuiSpacer size="xl" />
      </Fragment>
    );
  }

  const callOut = !error ? (
    <EuiFlexItem grow={false} className="dscNoResults">
      <EuiCallOut
        title={
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsMatchSearchCriteriaTitle"
            defaultMessage="No results match your search criteria"
          />
        }
        color="warning"
        iconType="help"
        data-test-subj="discoverNoResults"
      />
      {timeFieldMessage}
      {luceneQueryMessage}
    </EuiFlexItem>
  ) : (
    <EuiFlexItem grow={true} className="dscNoResults">
      <EuiCallOut
        title={
          <FormattedMessage
            id="discover.noResults.searchExamples.noResultsBecauseOfError"
            defaultMessage="No results were returned because of an error"
          />
        }
        color="warning"
        iconType="alert"
        data-test-subj="discoverNoResultsError"
      >
        <EuiButton size="s" onClick={() => data.search.showError(error)}>
          <FormattedMessage
            id="discover.showErrorMessageAgain"
            defaultMessage="Show error message again"
          />
        </EuiButton>
      </EuiCallOut>
    </EuiFlexItem>
  );

  return (
    <Fragment>
      <EuiSpacer size="xl" />
      <EuiFlexGroup justifyContent="center">{callOut}</EuiFlexGroup>
    </Fragment>
  );
}
