import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Layout, Button, Table, Space, message, Tag, Menu, Select, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ShopOutlined } from '@ant-design/icons';
import { useApi } from '../hooks/useApi';

const { Header, Sider, Content } = Layout;

interface Booking {
  id: string;
  hotelId: string;
  guestName: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms: number;
  totalPrice: number;
  status: string;
}

interface Hotel {
  id: string;
  name: string;
  merchantId: string;
}

function BookingList() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string | undefined>(undefined);
  const navigate = useNavigate();

  // 关键修复：只使用稳定方法引用，避免把整个 api 对象作为依赖导致请求循环。
  const { get, put } = useApi({ showMessage: false });

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

  const fetchHotels = useCallback(async () => {
    try {
      const params: any = {
        role: user.role,
        userId: user.id,
      };

      if (user.role === 'merchant') {
        params.merchantId = user.id;
      }

      const response = await get('http://localhost:3000/api/hotels', {
        params,
      });

      if (response.data.code === 200) {
        setHotels(response.data.data || []);
      } else {
        message.error(response.data.message || '获取酒店列表失败');
      }
    } catch (error: any) {
      message.error('获取酒店列表失败');
      console.error('fetchHotels error:', error);
    }
  }, [get, user.role, user.id]);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      const response = await get('http://localhost:3000/api/bookings', {
        params: {
          role: user.role,
          userId: user.id,
          hotelId: selectedHotelId,
        },
      });

      if (response.data.code === 200) {
        setBookings(response.data.data || []);
      } else {
        message.error(response.data.message || '获取预订列表失败');
      }
    } catch (error: any) {
      message.error('获取预订列表失败');
      console.error('fetchBookings error:', error);
    } finally {
      setLoading(false);
    }
  }, [get, user.role, user.id, selectedHotelId]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await put(
        `http://localhost:3000/api/bookings/${bookingId}`,
        { status: newStatus },
        {
          params: {
            role: user.role,
            userId: user.id,
          },
        }
      );

      if (response.data.code === 200) {
        message.success('预订状态已更新');
        fetchBookings();
      } else {
        message.error(response.data.message || '更新失败');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '更新失败');
      console.error('handleStatusChange error:', error);
    }
  };

  const columns = [
    {
      title: '客人名字',
      dataIndex: 'guestName',
      key: 'guestName',
    },
    {
      title: '客人电话',
      dataIndex: 'guestPhone',
      key: 'guestPhone',
    },
    {
      title: '入住日期',
      dataIndex: 'checkInDate',
      key: 'checkInDate',
    },
    {
      title: '退房日期',
      dataIndex: 'checkOutDate',
      key: 'checkOutDate',
    },
    {
      title: '房间数',
      dataIndex: 'numberOfRooms',
      key: 'numberOfRooms',
    },
    {
      title: '总价（元）',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (price: number) => `¥${price}`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, ReactNode> = {
          pending: <Tag color='orange'>待确认</Tag>,
          confirmed: <Tag color='green'>已确认</Tag>,
          cancelled: <Tag color='red'>已取消</Tag>,
        };
        return statusMap[status] || <Tag>{status}</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Booking) => (
        <Space>
          {record.status === 'pending' && (
            <Button
              type='primary'
              size='small'
              onClick={() => handleStatusChange(record.id, 'confirmed')}
            >
              确认
            </Button>
          )}
          {record.status !== 'cancelled' && (
            <Button
              danger
              size='small'
              onClick={() => handleStatusChange(record.id, 'cancelled')}
            >
              取消
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme='dark' width={200}>
        <div style={{ color: 'white', padding: '20px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
          易宿酒店后台
        </div>
        <Menu theme='dark' mode='inline' items={menuItems} />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: 'white' }}>
            {user.role === 'admin' ? '预订管理' : '预订查询'}
          </h2>
          <Button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}
          >
            返回
          </Button>
        </Header>

        <Content style={{ padding: '20px', background: '#f0f2f5' }}>
          {user.role === 'admin' && hotels.length > 0 && (
            <div style={{ marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '4px' }}>
              <label style={{ marginRight: '10px' }}>按酒店筛选：</label>
              <Select
                placeholder='选择酒店（不选则显示全部）'
                style={{ width: '300px' }}
                allowClear
                value={selectedHotelId}
                onChange={(value: string | undefined) => setSelectedHotelId(value)}
                options={hotels.map(h => ({ label: h.name, value: h.id }))}
              />
            </div>
          )}

          <div style={{ background: 'white', padding: '20px', borderRadius: '4px' }}>
            <Spin spinning={loading}>
              <Table columns={columns} dataSource={bookings} loading={loading} rowKey='id' />
            </Spin>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default BookingList;
