import * as H from 'history';

//TODO[Router] replace with LocationSrv
import { LocationService as LocationServiceAPI } from '@grafana/runtime';
import { locationUtil } from '@grafana/data';
import { navigationLogger, queryStringToJSON, setViewModeBodyClass } from './utils';
import { KioskUrlValue } from '../../types';

//TODO[Router] replace with LocationSrv
export class LocationService implements LocationServiceAPI {
  private readonly history: H.History;
  private fullPageReloadRoutes = ['/logout'];

  constructor(history?: H.History<any>) {
    this.history = history || H.createBrowserHistory();

    this.history.listen((update) => {
      navigationLogger('LocationService', false, 'history.listen', update);
      const urlWithoutBase = locationUtil.stripBaseFromUrl(update.pathname);
      if (this.fullPageReloadRoutes.indexOf(urlWithoutBase) > -1) {
        window.location.href = update.pathname;
        return;
      }

      const mode = queryStringToJSON(update.search).kiosk as KioskUrlValue;
      setViewModeBodyClass(mode);
    });

    // For debugging purposes the location service is attached to global _debug variable
    if (process.env.NODE_ENV !== 'production') {
      // @ts-ignore
      let debugGlobal = window['_debug'];
      if (debugGlobal) {
        debugGlobal = {
          ...debugGlobal,
          location: this,
        };
      } else {
        debugGlobal = {
          location: this,
        };
      }
      // @ts-ignore
      window['_debug'] = debugGlobal;
    }
  }

  getHistory() {
    return this.history;
  }

  getUrlSearchParams = () => {
    return new URLSearchParams(this.history.location.search);
  };

  partial = (query: Record<string, any>, replace?: boolean) => {
    const currentLocation = this.history.location;
    const params = this.getUrlSearchParams();

    for (const key of Object.keys(query)) {
      if (params.has(key)) {
        // removing params with null | undefined
        if (query[key] === null || query[key] === undefined) {
          params.delete(key);
        } else {
          params.set(key, query[key]);
        }
      } else {
        // ignoring params with null | undefined values
        if (query[key] !== null && query[key] !== undefined) {
          params.append(key, query[key]);
        }
      }
    }

    const locationUpdate: H.Location = {
      ...currentLocation,
      search: params.toString(),
    };

    if (replace) {
      this.history.replace(locationUpdate);
    } else {
      this.history.push(locationUpdate);
    }
  };

  push = (location: H.Path | H.LocationDescriptor) => {
    this.history.push(location);
  };

  replace = (location: H.Path) => {
    this.history.replace(location);
  };

  getCurrentLocation = () => {
    return this.history.location;
  };

  // Angular $location compat API
  // TODO[Router]
  url(newUrl?: string | null) {
    navigationLogger('LocationService', false, 'Angular compat layer: url');
    throw new Error('Angular compat layer: url implementation missing');

    if (newUrl) {
      return this as any;
    }
    return this.history.location;
  }

  // TODO[Router]
  hash(newHash?: string | null) {
    navigationLogger('LocationService', false, 'Angular compat layer: hash');

    if (newHash) {
      throw new Error('Angular compat layer: hash implementation missing');
      return this as any;
    }
    return this.history.location.hash;
  }

  path(pathname?: string) {
    navigationLogger('LocationService', false, 'Angular compat layer: path');
    if (pathname) {
      this.push(pathname);
      return this as any;
    }

    return this.history.location.pathname;
  }

  // TODO[Router]
  //@ts-ignore
  search(search: any): any {
    navigationLogger('LocationService', false, 'Angular compat layer: search');
    throw new Error('Angular compat layer: search implementation missing');
    // This is a makover of original Angular's implementation.
    // It uses history instead of $location internals
    // switch (arguments.length) {
    //   case 0:
    //     const query = this.history.location.search;
    //     return parseKeyValue(query.slice(1));
    //   case 1:
    //     if (isString(search) || isNumber(search)) {
    //       search = search.toString();
    //       // TODO
    //       // this.history.push(
    //       //   {
    //       //     pathname: this.history.location.pathname,
    //       //     hash: this.history.location.hash,
    //       //     search: `?${search}`,
    //       //   },
    //       //   { ...this.history.location.state }
    //       // );
    //       // this.$$search = parseKeyValue(search);
    //     } else if (isObject(search)) {
    //       const newSearch = { ...search };
    //       // remove object undefined or null properties
    //       forEach(newSearch, (value: any, key: any) => {
    //         if (value == null) {
    //           delete newSearch[key];
    //         }
    //       });
    //
    //       // this.history.push(
    //       //   {
    //       //     pathname: this.history.location.pathname,
    //       //     hash: this.history.location.hash,
    //       //     search: `?${queryString(newSearch)}`,
    //       //   },
    //       //   { ...this.history.location.state }
    //       // );
    //     } else {
    //       throw new Error('The first argument of the `$location#search()` call must be a string or an object.');
    //     }
    //     break;
    //   default:
    //     if (isUndefined(paramValue) || paramValue === null) {
    //       const newSearch = { ...search };
    //       delete newSearch[search];
    //       // this.history.push(
    //       // {
    //       //   pathname: this.history.location.pathname,
    //       //   hash: this.history.location.hash,
    //       //   search: `?${queryString(newSearch)}`,
    //       // },
    //       // { ...this.history.location.state }
    //       // );
    //     } else {
    //       const newSearch = parseKeyValue(this.history.location.search.slice(1));
    //       // @ts-ignore
    //       newSearch[search] = paramValue;
    //       // this.history.push(
    //       //   {
    //       //     pathname: this.history.location.pathname,
    //       //     hash: this.history.location.hash,
    //       //     search: `?${queryString(newSearch)}`,
    //       //   },
    //       //   { ...this.history.location.state }
    //       // );
    //     }
    // }
  }
}