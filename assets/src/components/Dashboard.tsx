import React, {useEffect, useState} from 'react';
import {
  useLocation,
  Switch,
  Redirect,
  Route,
  Link,
  RouteComponentProps,
} from 'react-router-dom';
import {Helmet} from 'react-helmet';
import {Box, Flex} from 'theme-ui';
import {ChatWidget, Papercups} from '@papercups-io/chat-widget';
// import {Storytime} from '../lib/storytime'; // For testing
import {Storytime} from '@papercups-io/storytime';
import {colors, Badge, Layout, Menu, Sider} from './common';
import {
  ApiOutlined,
  MailOutlined,
  UserOutlined,
  LineChartOutlined,
  LogoutOutlined,
  CreditCardOutlined,
  SmileOutlined,
  TeamOutlined,
  VideoCameraOutlined,
} from './icons';
import {BASE_URL, env, isDev, isEuEdition, isHostedProd} from '../config';
import analytics from '../analytics';
import {hasValidStripeKey} from '../utils';
import {Account, User} from '../types';
import {useAuth} from './auth/AuthProvider';
import AccountOverview from './account/AccountOverview';
import UserProfile from './account/UserProfile';
import GettingStartedOverview from './account/GettingStartedOverview';
import {
  ConversationsProvider,
  useConversations,
} from './conversations/ConversationsProvider';
import AllConversations from './conversations/AllConversations';
import MyConversations from './conversations/MyConversations';
import PriorityConversations from './conversations/PriorityConversations';
import ClosedConversations from './conversations/ClosedConversations';
import IntegrationsOverview from './integrations/IntegrationsOverview';
import BillingOverview from './billing/BillingOverview';
import CustomersPage from './customers/CustomersPage';
import CustomerDetailsPage from './customers/CustomerDetailsPage';
import SessionsOverview from './sessions/SessionsOverview';
import InstallingStorytime from './sessions/InstallingStorytime';
import LiveSessionViewer from './sessions/LiveSessionViewer';
import ReportingDashboard from './reporting/ReportingDashboard';
import CompaniesPage from './companies/CompaniesPage';
import CreateCompanyPage from './companies/CreateCompanyPage';
import UpdateCompanyPage from './companies/UpdateCompanyPage';
import CompanyDetailsPage from './companies/CompanyDetailsPage';
import TagsOverview from './tags/TagsOverview';
import TagDetailsPage from './tags/TagDetailsPage';

const {
  REACT_APP_STORYTIME_ENABLED,
  REACT_APP_ADMIN_ACCOUNT_ID = 'eb504736-0f20-4978-98ff-1a82ae60b266',
} = env;

const TITLE_FLASH_INTERVAL = 2000;

const shouldDisplayChat = (pathname: string) => {
  return isHostedProd && pathname !== '/account/getting-started';
};

const getSectionKey = (pathname: string) => {
  if (pathname.startsWith('/companies')) {
    return ['customers', 'companies'];
  } else if (pathname.startsWith('/customers')) {
    return ['customers', 'people'];
  } else if (pathname.startsWith('/tags')) {
    return ['customers', 'tags'];
  } else {
    return pathname.split('/').slice(1); // Slice off initial slash
  }
};

const ChatWithUs = ({
  currentUser,
  account,
}: {
  currentUser: User;
  account?: Account | null;
}) => {
  if (isEuEdition) {
    return (
      <ChatWidget
        title="Need help with anything?"
        subtitle="Ask us in the chat window below 😊"
        greeting="Hi there! Send us a message and we'll get back to you as soon as we can."
        primaryColor="#1890ff"
        accountId={REACT_APP_ADMIN_ACCOUNT_ID}
        hideToggleButton
        baseUrl="https://app.papercups-eu.io"
        customer={{
          external_id: [currentUser.id, currentUser.email].join('|'),
          email: currentUser.email,
          metadata: {
            company_name: account?.company_name,
            subscription_plan: account?.subscription_plan,
            edition: 'EU',
          },
        }}
      />
    );
  }

  return (
    <ChatWidget
      title="Need help with anything?"
      subtitle="Ask us in the chat window below 😊"
      greeting="Hi there! Send us a message and we'll get back to you as soon as we can."
      primaryColor="#1890ff"
      accountId={REACT_APP_ADMIN_ACCOUNT_ID}
      hideToggleButton
      customer={{
        external_id: [currentUser.id, currentUser.email].join('|'),
        email: currentUser.email,
        metadata: {
          company_name: account?.company_name,
          subscription_plan: account?.subscription_plan,
          edition: 'US',
        },
      }}
    />
  );
};

// TODO: not sure if this is the best way to handle this, but the goal
// of this component is to flash the number of unread messages in the
// tab (i.e. HTML title) so users can see when new messages arrive
const DashboardHtmlHead = ({totalNumUnread}: {totalNumUnread: number}) => {
  const [htmlTitle, setHtmlTitle] = useState('Papercups');

  const toggleNotificationMessage = () => {
    if (totalNumUnread > 0 && htmlTitle.startsWith('Papercups')) {
      setHtmlTitle(
        `(${totalNumUnread}) New message${totalNumUnread === 1 ? '' : 's'}!`
      );
    } else {
      setHtmlTitle('Papercups');
    }
  };

  useEffect(() => {
    let timeout;

    if (totalNumUnread > 0) {
      timeout = setTimeout(toggleNotificationMessage, TITLE_FLASH_INTERVAL);
    } else {
      clearTimeout(timeout);
    }
  });

  return (
    <Helmet defer={false}>
      <title>{totalNumUnread ? htmlTitle : 'Papercups'}</title>
    </Helmet>
  );
};

const Dashboard = (props: RouteComponentProps) => {
  const auth = useAuth();
  const {pathname} = useLocation();
  const {account, currentUser, unreadByCategory: unread} = useConversations();

  const [section, key] = getSectionKey(pathname);
  const totalNumUnread = (unread && unread.all) || 0;
  const shouldDisplayBilling = hasValidStripeKey();

  const logout = () => auth.logout().then(() => props.history.push('/login'));

  useEffect(() => {
    if (currentUser && currentUser.id) {
      const {id, email} = currentUser;

      analytics.identify(id, email);
    }

    if (REACT_APP_STORYTIME_ENABLED && currentUser) {
      const {id, email} = currentUser;
      // TODO: figure out a better way to initialize this?
      const storytime = Storytime.init({
        accountId: REACT_APP_ADMIN_ACCOUNT_ID,
        baseUrl: BASE_URL,
        debug: isDev,
        customer: {
          email,
          external_id: [id, email].join('|'),
        },
      });

      return () => storytime.finish();
    }
  }, [currentUser]);

  return (
    <Layout>
      <DashboardHtmlHead totalNumUnread={totalNumUnread} />

      <Sider
        width={220}
        collapsed={false}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          color: colors.white,
        }}
      >
        <Flex sx={{flexDirection: 'column', height: '100%'}}>
          <Box py={3} sx={{flex: 1}}>
            <Menu
              selectedKeys={[section, key]}
              defaultOpenKeys={[section, 'conversations']}
              mode="inline"
              theme="dark"
            >
              <Menu.SubMenu
                key="account"
                icon={<UserOutlined />}
                title="Account"
              >
                <Menu.Item key="overview">
                  <Link to="/account/overview">Overview</Link>
                </Menu.Item>
                <Menu.Item key="profile">
                  <Link to="/account/profile">My Profile</Link>
                </Menu.Item>
                <Menu.Item key="getting-started">
                  <Link to="/account/getting-started">Getting started</Link>
                </Menu.Item>
              </Menu.SubMenu>
              <Menu.SubMenu
                key="conversations"
                icon={<MailOutlined />}
                title="Inbox"
              >
                <Menu.Item key="all">
                  <Link to="/conversations/all">
                    <Flex
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box mr={2}>All conversations</Box>
                      <Badge
                        count={unread.all}
                        style={{borderColor: '#FF4D4F'}}
                      />
                    </Flex>
                  </Link>
                </Menu.Item>
                <Menu.Item key="me">
                  <Link to="/conversations/me">
                    <Flex
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box mr={2}>Assigned to me</Box>
                      <Badge
                        count={unread.mine}
                        style={{borderColor: '#FF4D4F'}}
                      />
                    </Flex>
                  </Link>
                </Menu.Item>
                <Menu.Item key="priority">
                  <Link to="/conversations/priority">
                    <Flex
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box mr={2}>Prioritized</Box>
                      <Badge
                        count={unread.priority}
                        style={{borderColor: '#FF4D4F'}}
                      />
                    </Flex>
                  </Link>
                </Menu.Item>
                <Menu.Item key="closed">
                  <Link to="/conversations/closed">Closed</Link>
                </Menu.Item>
              </Menu.SubMenu>
              <Menu.SubMenu
                key="sessions"
                icon={<VideoCameraOutlined />}
                title="Sessions"
              >
                <Menu.Item key="list">
                  <Link to="/sessions/list">Live sessions</Link>
                </Menu.Item>
                <Menu.Item key="setup">
                  <Link to="/sessions/setup">Set up Storytime</Link>
                </Menu.Item>
              </Menu.SubMenu>

              <Menu.SubMenu
                key="customers"
                icon={<TeamOutlined />}
                title="Customers"
              >
                <Menu.Item key="people">
                  <Link to="/customers">People</Link>
                </Menu.Item>
                <Menu.Item key="companies">
                  <Link to="/companies">Companies</Link>
                </Menu.Item>
                <Menu.Item key="tags">
                  <Link to="/tags">Tags</Link>
                </Menu.Item>
              </Menu.SubMenu>
              <Menu.Item
                title="Reporting"
                icon={<LineChartOutlined />}
                key="reporting"
              >
                <Link to="/reporting">Reporting</Link>
              </Menu.Item>
              <Menu.Item
                title="Integrations"
                icon={<ApiOutlined />}
                key="integrations"
              >
                <Link to="/integrations">Integrations</Link>
              </Menu.Item>
              {shouldDisplayBilling && (
                <Menu.Item
                  title="Billing"
                  icon={<CreditCardOutlined />}
                  key="billing"
                >
                  <Link to="/billing">Billing</Link>
                </Menu.Item>
              )}
            </Menu>
          </Box>

          <Box py={3}>
            <Menu mode="inline" theme="dark" selectable={false}>
              {shouldDisplayChat(pathname) && (
                <Menu.Item
                  title="Chat with us!"
                  icon={<SmileOutlined />}
                  key="chat"
                  onClick={Papercups.toggle}
                >
                  Chat with us!
                </Menu.Item>
              )}
              <Menu.Item
                title="Log out"
                icon={<LogoutOutlined />}
                key="logout"
                onClick={logout}
              >
                Log out
              </Menu.Item>
            </Menu>
          </Box>
        </Flex>
      </Sider>

      <Layout style={{marginLeft: 220, background: colors.white}}>
        <Switch>
          <Route path="/account/overview" component={AccountOverview} />
          <Route path="/account/profile" component={UserProfile} />
          <Route
            path="/account/getting-started"
            component={GettingStartedOverview}
          />
          <Route path="/account*" component={AccountOverview} />
          <Route path="/customers/:id" component={CustomerDetailsPage} />
          <Route path="/customers" component={CustomersPage} />
          <Route path="/companies/new" component={CreateCompanyPage} />
          <Route path="/companies/:id/edit" component={UpdateCompanyPage} />
          <Route path="/companies/:id" component={CompanyDetailsPage} />
          <Route path="/companies" component={CompaniesPage} />
          <Route path="/integrations/:type" component={IntegrationsOverview} />
          <Route path="/integrations" component={IntegrationsOverview} />
          <Route path="/integrations*" component={IntegrationsOverview} />
          <Route path="/conversations/all" component={AllConversations} />
          <Route path="/conversations/me" component={MyConversations} />
          <Route
            path="/conversations/priority"
            component={PriorityConversations}
          />
          <Route path="/conversations/closed" component={ClosedConversations} />
          <Route
            path="/conversations/:id"
            render={(props: RouteComponentProps<{id: string}>) => {
              const {id: conversationId} = props.match.params;

              return (
                <Redirect to={`/conversations/all?cid=${conversationId}`} />
              );
            }}
          />
          {shouldDisplayBilling && (
            <Route path="/billing" component={BillingOverview} />
          )}
          <Route path="/reporting" component={ReportingDashboard} />
          <Route path="/sessions/live/:session" component={LiveSessionViewer} />
          <Route path="/sessions/list" component={SessionsOverview} />
          <Route path="/sessions/setup" component={InstallingStorytime} />
          <Route path="/sessions*" component={SessionsOverview} />
          <Route path="/tags/:id" component={TagDetailsPage} />
          <Route path="/tags" component={TagsOverview} />
          <Route path="*" render={() => <Redirect to="/conversations/all" />} />
        </Switch>
      </Layout>

      {currentUser && shouldDisplayChat(pathname) && (
        <ChatWithUs currentUser={currentUser} account={account} />
      )}
    </Layout>
  );
};

const DashboardWrapper = (props: RouteComponentProps) => {
  return (
    <ConversationsProvider>
      <Dashboard {...props} />
    </ConversationsProvider>
  );
};

export default DashboardWrapper;
