import { Icon, Icons } from 'construct-ui';
import m from 'mithril';


export interface SubSectionProps {
    title: string;
    is_visible: boolean;
    is_active: boolean; // Is this the current page
    is_updated: boolean; // Does this page have updates (relevant for chat, less so for other sections)
    onclick: Function;
    onhover?: Function;
    row_icon?: boolean;
    right_icon?: m.Component;
}

export interface SectionGroupProps {
    title: string;
    contains_children: boolean;
    default_toggle: boolean;
    is_visible: boolean; // Is this section shown as an option
    is_active: boolean; // Is this the current page
    is_updated: boolean; // Does this page have updates (relevant for chat, less so for other sections)
    onclick: Function;
    onhover?: Function;
    display_data: SubSectionProps[] | null;
    right_icon?: m.Component;
}

export interface SidebarSectionProps {
    title: string;
    default_toggle: boolean;
    is_active: boolean;
    onclick: Function;
    onhover?: Function;
    display_data: SectionGroupProps[];
    toggle_disabled?: boolean;
    right_icon?: m.Component;
    extra_components?: m.Vnode;
}

const SubSection: m.Component<SubSectionProps, never> = {
    view: (vnode) => {
        const {title, is_visible, is_active, onclick, row_icon, is_updated, right_icon} = vnode.attrs;
        if (!is_visible) {
            return;
        }

        const click_handler = (e) => {
            onclick(e);
        }

        let title_text_class = '.title-standard';
        if (is_active) {
            title_text_class = '.title-active'
        } else if (!is_updated) {
            title_text_class = '.title-stale'
        }

        return m('.SubSection',{
            onclick: (e) => click_handler(e),
            className: `${is_active ? 'active' : ''}`,
        }, [
            row_icon && m(Icon, {name: Icons.HASH}),
            m(title_text_class, title),
            right_icon && m('.right_icon', [m(right_icon)])
        ])
    }
}

const SectionGroup: m.Component<SectionGroupProps, {toggled: boolean, hover_on: boolean}> = {
    oninit: (vnode) => {
        vnode.state.toggled = vnode.attrs.default_toggle;
    },
    view: (vnode) => {
        const {title, contains_children, display_data, is_visible, is_updated, is_active, onclick, onhover, right_icon} = vnode.attrs;
        const {toggled} = vnode.state;

        if (!is_visible) {
            return;
        }

        const click_handler = (e) => {
            if (contains_children) {
                vnode.state.toggled = !toggled;
            }
            onclick(e, vnode.state.toggled);
        }

        const carat = toggled ? m(Icon, {
                name: Icons.CHEVRON_DOWN,
            }) : m(Icon, {
                name: Icons.CHEVRON_RIGHT,
            });

        let title_text_class = '.section-title-text-standard';
        if (is_active && !contains_children) {
            title_text_class = '.section-title-text-active'
        } else if (!is_updated) {
            title_text_class = '.section-title-text-stale'
        }

        let background_color = 'none';
        if (is_active && !contains_children) {
            background_color = '#EDE7FF'
        }

        const mouse_enter_handler = (e) => {
            if (toggled || vnode.state.hover_on) {
                e.redraw = false;
                e.stopPropagation();
            }
            if (!toggled) {
                background_color = '#EDE7FF';
                vnode.state.hover_on = true;
            }
        }

        const mouse_leave_handler = (e) => {
            background_color = (is_active && !contains_children) ? '#EDE7FF' : 'none';
            vnode.state.hover_on = false;
        }

        return m('.SectionGroup', {
            onmouseenter: (e) => mouse_enter_handler(e),
            onmouseleave: (e) => mouse_leave_handler(e),
        },[
            m('.SectionGroupTitle', {
                onclick: (e) => click_handler(e),
                style: `background-color: ${vnode.state.hover_on ? '#EDE7FF' : background_color}`,
            }, [
                contains_children ? m('.carat', carat) : m('.no-carat'),
                m(title_text_class, title),
                right_icon && m('.right_icon', [m(right_icon)])
            ]),
            contains_children && toggled && m('.subsections', [
                display_data.map((subsection) => (
                    m(SubSection, {...subsection})
                ))
            ])
        ])

    }
}


const SidebarSection: m.Component<SidebarSectionProps, {toggled: boolean, hover_color: string}> = {
    oninit: (vnode) => {
        vnode.state.toggled = vnode.attrs.default_toggle;
        vnode.state.hover_color = 'none';
    },
    view: (vnode) => {

        const {title, onclick, toggle_disabled, display_data, right_icon, extra_components} = vnode.attrs;
        const {toggled, hover_color} = vnode.state;

        const click_handler = (e) => {
            if (toggle_disabled) {
                return;
            }
            vnode.state.toggled = !toggled;
            if (vnode.state.toggled) {
                vnode.state.hover_color = 'none';
            }
            onclick(e, vnode.state.toggled);
        }

        const mouse_enter_handler = (e) => {
            if (toggled || vnode.state.hover_color) {
                e.redraw = false;
                e.stopPropagation();
            }
            if (!toggled) {
                vnode.state.hover_color = '#EDE7FF';
            }
        }

        const mouse_leave_handler = (e) => {
            vnode.state.hover_color = 'none';
        }

        const carat = toggled ? m(Icon, {
            name: Icons.CHEVRON_DOWN,
        }) : m(Icon, {
            name: Icons.CHEVRON_RIGHT,
        });

        return m('.SidebarSection', {
            onmouseenter: (e) => mouse_enter_handler(e),
            onmouseleave: (e) => mouse_leave_handler(e),
            style: `background-color: ${hover_color}`
        }, [
            m('.SidebarTitle', {
                onclick: (e) => click_handler(e),
            }, [
                m('.title-text', title),
                right_icon && m('.right_icon', [m(right_icon)]),
                m('.toggle-icon', carat)
            ]),
            toggled && m('.section-groups', [
                display_data.map((section_group) => (
                    m(SectionGroup, {...section_group})
                ))
            ]),
            extra_components
        ])
    }
};



export default SidebarSection;