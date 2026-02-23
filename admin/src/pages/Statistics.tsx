import { useState, useEffect, useMemo, useCallback } from 'react';
import { Layout, Menu, Button, Card, Row, Col, Statistic, Table, message, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ShopOutlined, DollarOutlined, ShoppingCartOutlined, TeamOutlined } from '@ant-design/icons';
import { useApi } from '../hooks/useApi';

const { Header, Sider, Content } = Layout;

interface StatisticsData {
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  avgRevenuePerBooking: number;
  byHotel: Array<{
    hotelId: string;
    hotelName: string;
    revenue: number;
    bookingCount: number;
  }>;
}

function Statistics() {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const api = useApi({ showMessage: false });

  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

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
        {
          key: 'statistics',
          icon: <ShopOutlined />,
          label: '收入统计',
          onClick: () => navigate('/statistics'),
        },
        {
          key: 'holidays',
          icon: <ShopOutlined />,
          label: '节假日活动',
          onClick: () => navigate('/holidays'),
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
        {
          key: 'statistics',
          icon: <ShopOutlined />,
          label: '收入统计',
          onClick: () => navigate('/statistics'),
        },
      ];

  useEffect(() => {
    fetchStatistics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('http://localhost:3000/api/statistics/revenue', {
        params: {
          role: user.role,
          userId: user.id,
        },
      });

      if (response.data.code === 200) {
        setStatistics(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('获取统计数据失败');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [api, user.role, user.id]);

  const columns = [
    {
      title: '酒店名称',
      dataIndex: 'hotelName',
      key: 'hotelName',
    },
    {
      title: '收入（元）',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue: number) => `¥${revenue.toLocaleString()}`,
    },
    {
      title: '预订数',
      dataIndex: 'bookingCount',
      key: 'bookingCount',
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
          <h2 style={{ margin: 0, color: 'white' }}>收入统计</h2>
          <Button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
            返回
          </Button>
        </Header>

        <Content style={{ padding: '20px', background: '#f0f2f5' }}>
          <Spin spinning={loading}>
            {statistics && (
              <>
                {/* 统计卡片 */}
                <Row gutter={16} style={{ marginBottom: '20px' }}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="总收入"
                        value={statistics.totalRevenue}
                        prefix="¥"
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="总预订数"
                        value={statistics.totalBookings}
                        icon={<ShoppingCartOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="已确认"
                        value={statistics.confirmedBookings}
                        icon={<TeamOutlined />}
                        valueStyle={{ color: '#52c41a' }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card>
                      <Statistic
                        title="平均收入/笔"
                        value={statistics.avgRevenuePerBooking}
                        prefix="¥"
                        valueStyle={{ color: '#faad14' }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 按酒店统计表格 */}
                <Card title="按酒店统计" style={{ marginBottom: '20px' }}>
                  <Table
                    columns={columns}
                    dataSource={statistics.byHotel}
                    rowKey="hotelId"
                    pagination={false}
                  />
                </Card>
              </>
            )}
          </Spin>
        </Content>
      </Layout>
    </Layout>
  );
}

export default Statistics;



