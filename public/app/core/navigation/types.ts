import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

export interface GrafanaRouteComponentProps<T = any, Q extends Partial<Record<string, string>> = any>
  extends RouteComponentProps<T> {
  $injector: any;
  route: RouteDescriptor;
  queryParams: Q;
}

export type GrafanaRouteComponent<T = any> = React.ComponentType<GrafanaRouteComponentProps<T>>;

export interface RouteDescriptor {
  path: string;
  component: GrafanaRouteComponent<any>;
  roles?: () => string[];
  pageClass?: string;
  /** Can be used like an id for the route if the same component is used by many routes */
  routeName?: string;
}
