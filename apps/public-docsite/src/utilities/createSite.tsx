// TODO: move to react-docsite-components once Site moves

import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { ThemeProvider } from '@fluentui/react';
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import {
  INavPage,
  ISiteDefinition,
  currentFabricBreakpoint,
  handleRedirects,
} from '@fluentui/react-docsite-components/lib/index2';
import { Route, Router } from '@fluentui/react-docsite-components';
import { SiteGlobals } from '@fluentui/public-docsite-setup';
import { Site } from '../components/Site/index';
import { hasUHF } from './location';

import '../styles/styles.scss';

declare const window: Window & SiteGlobals;

// This global is set for the real website by the manifest file (generated by create-site-manifests)
// and tells where to find the other chunks.
if (window.__siteConfig?.baseCDNUrl) {
  // __webpack_public_path__ is a "magic" webpack variable used to set the public path,
  // which determines where chunks should be loaded from. https://webpack.js.org/guides/public-path/
  // It MUST be set in the actual site root (not via @fluentui/public-docsite-setup/lib/loadSite)
  // and MUST use this syntax (not window.__webpack_public_path__) because while bundling,
  // webpack replaces it with setting __webpack_require__.p for runtime use, and each bundle
  // has a different __webpack_require__ instance.
  __webpack_public_path__ = window.__siteConfig.baseCDNUrl;
}

initializeIcons();

// blog storage is now immutable, so new versions of fabric-core will be at a new url based on the build number
addCSSToHeader(
  'https://res-1.cdn.office.net/files/fabric-cdn-prod_20220825.001/office-ui-fabric-core/11.0.1/css/fabric.min.css',
);

let rootElement: HTMLElement;

export function createSite<TPlatforms extends string>(
  siteDefinition: ISiteDefinition<TPlatforms>,
  defaultRouteComponent?: React.ComponentType | React.ComponentType[],
) {
  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    _onLoad();
  } else {
    window.onload = _onLoad;
  }
  window.onunload = _onUnload;

  function _getBreakpoint(): void {
    currentFabricBreakpoint();
  }

  function _createRoutes(pages: INavPage<TPlatforms>[]): JSX.Element[] {
    let routes: JSX.Element[] = [];
    pages.forEach((page: INavPage<TPlatforms>) => {
      // Create a route for each page and its children.
      // Categories don't have an actual corresponding URL but may have children.
      if (page.url && (page.component || page.getComponent)) {
        routes.push(
          <Route key={page.url} path={page.url} component={page.component} getComponent={page.getComponent} />,
        );
      }
      if (page.platforms) {
        Object.keys(page.platforms).forEach((plat: TPlatforms) => {
          const platformPages: INavPage<TPlatforms>[] | undefined = page.platforms && page.platforms[plat];
          routes = routes.concat(_createRoutes(platformPages || []));
        });
      }
      if (page.pages) {
        routes = routes.concat(_createRoutes(page.pages));
      }
    });
    return routes;
  }

  function _getSiteRoutes() {
    const routes: JSX.Element[] = _createRoutes(siteDefinition.pages);

    // Add the default route
    if (defaultRouteComponent) {
      if (Array.isArray(defaultRouteComponent)) {
        defaultRouteComponent.forEach((Component, index) => {
          routes.push(<Route key={`default${index}`} component={Component} />);
        });
      } else {
        routes.push(<Route key="home" component={defaultRouteComponent} />);
      }
    }

    return routes;
  }

  function _onLoad(): void {
    if (!window.location.hash) {
      window.location.hash = '#/';
    }

    handleRedirects(siteDefinition.redirects);

    // Load the app into this element.
    rootElement = rootElement || document.getElementById('main');
    _getBreakpoint();

    const renderSite = (props: {}) => <Site siteDefinition={siteDefinition} hasUHF={hasUHF} {...props} />;

    ReactDOM.render(
      <ThemeProvider>
        <Router>
          <Route component={renderSite}>{_getSiteRoutes()}</Route>
        </Router>
      </ThemeProvider>,
      rootElement,
    );
  }

  function _onUnload() {
    if (rootElement) {
      ReactDOM.unmountComponentAtNode(rootElement);
    }
  }
}

function addCSSToHeader(fileName: string): void {
  const headEl = document.head;
  const linkEl = document.createElement('link');
  const styleTags = headEl.getElementsByTagName('style');

  linkEl.type = 'text/css';
  linkEl.rel = 'stylesheet';
  linkEl.href = fileName;

  // insert fabric css before other styles so it doesn't override component styles
  if (styleTags.length) {
    headEl.insertBefore(linkEl, styleTags[0]);
  } else {
    headEl.appendChild(linkEl);
  }
}
