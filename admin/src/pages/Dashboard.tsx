import { Layout, Menu, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { LogoutOutlined, ShopOutlined } from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

function Dashboard() {
  const navigate = useNavigate();
  
  // 获取当前登录用户
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const menuItems = user.role === 'admin'
    ? [
        {
          key: 'review',
          icon: <ShopOutlined />,
          label: '酒店审核',
          onClick: () => navigate('/hotels'),
        },
        {
          key: 'bookings',
          icon: <ShopOutlined />,
          label: '预订管理',
          onClick: () => navigate('/bookings'),
        },
      ]
    : [
        {
          key: 'hotels',
          icon: <ShopOutlined />,
          label: '我的酒店',
          onClick: () => navigate('/hotels'),
        },
        {
          key: 'bookings',
          icon: <ShopOutlined />,
          label: '预订查询',
          onClick: () => navigate('/bookings'),
        },
      ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={200}>
        <div style={{ color: 'white', padding: '20px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
          易宿酒店后台
        </div>
        <Menu theme="dark" mode="inline" items={menuItems} />
      </Sider>

      <Layout>
        <Header style={{ background: '#1890ff', color: 'white', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '16px' }}>欢迎回来</span>
          <Button type="primary" icon={<LogoutOutlined />} onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none' }}>
            登出
          </Button>
        </Header>

        <Content style={{ padding: '20px', background: '#f0f2f5' }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '4px' }}>
            <h2>{user.role === 'admin' ? '管理员面板' : '商户面板'}</h2>
            <p>
              {user.role === 'admin'
                ? '点击左侧菜单管理酒店和预订。'
                : '点击左侧菜单查看你的酒店和预订。'}
            </p>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default Dashboard;
