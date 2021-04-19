import 'modals/onboarding_modal/connect_tab.scss';

import { Button } from 'construct-ui';
import m from 'mithril';

import { onboardingCWIcon, onboardingArrowRightIcon, onboardingWalletIcon } from '../../components/sidebar/icons';

interface IOnboardingConnectAttr {
  onUseWallet: () => void;
  onUseCLI: () => void;
  address: string;
}

const OnboardingConnect: m.Component<IOnboardingConnectAttr, {}> = {
  view: (vnode) => {
    return m('.OnboardingConnect', [
      m('div.title', [
        m('div.icons', [
          m.trust(onboardingWalletIcon),
          m.trust(onboardingArrowRightIcon),
          m.trust(onboardingCWIcon),
        ]),
        m('h2', 'Connect Your Wallet'),
        m('span', 'Connect your wallet address to claim the following address on Commonwealth.')
      ]),
      m('div.address', vnode.attrs.address),
      m(Button, {
        label: 'Connect Wallet',
        onclick: () => {
          vnode.attrs.onUseWallet();
        }
      }),
      m('div.or', 'OR'),
      m('div.cli', 'Claim address with command line')
    ]);
  },
};

export default OnboardingConnect;
