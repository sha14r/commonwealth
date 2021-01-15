import m from 'mithril';
import app from 'state';
import { ChainBase } from 'models';
import Substrate from 'controllers/chain/substrate/main';
import { makeDynamicComponent } from 'models/mithril';
import { Inactives } from 'controllers/chain/substrate/staking';
import User from 'views/components/widgets/user';
import { Button, Classes, Popover } from 'construct-ui';

export interface IListNomineesState {
  dynamic: {
    nominees: Inactives
   }
}

export interface ListNomineesAttrs {
  stashId: string,
  nominating?: string[]
}

export interface NomineesListAttrs {
  nominees?: string[],
  title: string
}

const NomineesList: m.Component<NomineesListAttrs, {}> = {
  view: (vnode) => {
    const { nominees, title } = vnode.attrs;

    return m('div.nominees',
      m('p', title),
      m('hr'),
      m('div.padding-b-15', [
        app.chain.loaded
        && nominees.map((nominee) => m(User, { user: app.chain.accounts.get(nominee), linkify: true }))
      ]),
      m(Button, {
        class: Classes.POPOVER_DISSMISS,
        label: 'Dismiss',
        size: 'xs'
      }));
  },
};


const ListNominees = makeDynamicComponent<ListNomineesAttrs, IListNomineesState>({
  getObservables: (attrs) => ({
    groupKey: app.chain.class.toString(),
    nominees: (app.chain.base === ChainBase.Substrate)
      ? (app.chain as Substrate).staking.inActiveNominees(attrs.stashId, attrs.nominating)
      : null
  }),
  view: (vnode) => {
    if (!vnode.state.dynamic.nominees)
      return m('p', 'Loading ...');

    const { nomsActive, nomsInactive, nomsWaiting } = vnode.state.dynamic.nominees;

    return m('div.list-nominees',
      nomsActive
      && nomsActive.length !== 0
      && m('div.active-noms', m(Popover, {
        interactionType: 'click',
        trigger: m('div.active-noms.pointer', `Nominations (${nomsActive.length})`),
        content: m('div', m(NomineesList, { nominees: nomsActive, title: 'Active' }))
      })),
      nomsInactive
      && nomsInactive.length !== 0
      && m('div.inactive-noms', m(Popover, {
        interactionType: 'click',
        trigger: m('div.inactive-noms.pointer', `Nominations (${nomsInactive.length})`),
        content: m('div', m(NomineesList, { nominees: nomsInactive, title: 'Inactive' }))
      })),
      nomsWaiting
      && nomsWaiting.length !== 0
      && m('div.wait-noms', m(Popover, {
        interactionType: 'click',
        trigger: m('div.wait-noms.pointer', `Nominations (${nomsWaiting.length})`),
        content: m('div', m(NomineesList, { nominees: nomsWaiting, title: 'Waiting' }))
      })));
  }
});

export default ListNominees;