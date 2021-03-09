import React, { FC, useState } from 'react';
import { MapStateToProps, connect } from 'react-redux';
import { NavModel, SelectableValue, urlUtil } from '@grafana/data';
import Page from 'app/core/components/Page/Page';
import { StoreState } from 'app/types';
import { GrafanaRouteComponentProps } from '../../core/navigation/types';
import { getNavModel } from 'app/core/selectors/navModel';
import { useAsync } from 'react-use';
import { getBackendSrv, locationService } from '@grafana/runtime';
import { PlaylistDTO } from './types';
import { Button, Card, Checkbox, Field, LinkButton, Modal, RadioButtonGroup, VerticalGroup } from '@grafana/ui';
import { contextSrv } from 'app/core/core';
import OrgActionBar from 'app/core/components/OrgActionBar/OrgActionBar';

interface ConnectedProps {
  navModel: NavModel;
}

interface Props extends ConnectedProps, GrafanaRouteComponentProps {}

export const PlaylistPage: FC<Props> = ({ navModel }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [startPlaylist, setStartPlaylist] = useState<PlaylistDTO | undefined>();

  const { value: lists, loading } = useAsync(async () => {
    return getBackendSrv().get('/api/playlists', { query: searchQuery }) as Promise<PlaylistDTO[]>;
  });

  return (
    <Page navModel={navModel}>
      <Page.Contents isLoading={loading}>
        <OrgActionBar
          searchQuery={searchQuery}
          linkButton={{ title: 'New playlist', href: '/playlists/new' }}
          setSearchQuery={setSearchQuery}
        />
        {lists &&
          lists.map((playlist) => (
            <Card heading={playlist.name} key={playlist.id.toString()}>
              <Card.Actions>
                <Button variant="secondary" icon="play" onClick={() => setStartPlaylist(playlist)}>
                  Start playlist
                </Button>
                {contextSrv.isEditor && (
                  <LinkButton
                    key="edit"
                    variant="secondary"
                    href={`/playlists/edit/${playlist.id}`}
                    icon="cog"
                    disabled
                    title="Feature temporarily disabled"
                  >
                    Edit playlist
                  </LinkButton>
                )}
              </Card.Actions>
            </Card>
          ))}
        {startPlaylist && <StartModal playlist={startPlaylist} onDismiss={() => setStartPlaylist(undefined)} />}
      </Page.Contents>
    </Page>
  );
};

const mapStateToProps: MapStateToProps<ConnectedProps, {}, StoreState> = (state: StoreState) => ({
  navModel: getNavModel(state.navIndex, 'playlists'),
});

export default connect(mapStateToProps)(PlaylistPage);

export interface StartModalProps {
  playlist: PlaylistDTO;
  onDismiss: () => void;
}

export const StartModal: FC<StartModalProps> = ({ playlist, onDismiss }) => {
  const [mode, setMode] = useState<string>('');
  const [autoFit, setAutofit] = useState(false);

  const modes: Array<SelectableValue<string>> = [
    { label: 'Normal', value: '' },
    { label: 'TV', value: 'tv' },
    { label: 'Kiosk', value: 'full' },
  ];

  const onStart = () => {
    const params: any = {};
    if (mode) {
      params.kiosk = mode;
    }
    if (autoFit) {
      params.autofitpanels = true;
    }
    locationService.push(urlUtil.renderUrl(`/playlists/play/${playlist.id}`, params));
  };

  return (
    <Modal isOpen={true} icon="play" title="Start playlist" onDismiss={onDismiss}>
      <VerticalGroup>
        <Field label="Mode">
          <RadioButtonGroup value={mode} options={modes} onChange={setMode} />
        </Field>
        <Checkbox
          label="Autofit"
          description="Panel heights will be adjusted to fit screen size"
          name="autofix"
          value={autoFit}
          onChange={(e) => setAutofit(e.currentTarget.checked)}
        />
      </VerticalGroup>
      <div className="gf-form-button-row">
        <Button variant="primary" onClick={onStart}>
          Start {playlist.name}
        </Button>
      </div>
    </Modal>
  );
};
