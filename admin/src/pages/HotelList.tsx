import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Layout, Button, Table, Space, message, Popconfirm, Tag, Menu, Spin, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, EditOutlined, DeleteOutlined, ShopOutlined } from '@ant-design/icons';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config';

const { Header, Sider, Content } = Layout;

interface Hotel {
  id: string;
  name: string;
  city: string;
  starLevel?: number;
  pricePerNight: number;
  totalRooms: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | string;
  adStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  isHomeAd?: boolean;
  merchantId: string;
}

function HotelList() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { get, put, delete: removeHotel } = useApi({ showMessage: false });

  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

  const menuItems = user.role === 'admin'
    ? [
        { key: 'review', icon: <ShopOutlined />, label: '酒店审核', onClick: () => navigate('/hotels') },
        { key: 'bookings', icon: <ShopOutlined />, label: '预订管理', onClick: () => navigate('/bookings') },
        { key: 'statistics', icon: <ShopOutlined />, label: '收入统计', onClick: () => navigate('/statistics') },
        { key: 'holidays', icon: <ShopOutlined />, label: '节假日活动', onClick: () => navigate('/holidays') },
      ]
    : [
        { key: 'hotels', icon: <ShopOutlined />, label: '我的酒店', onClick: () => navigate('/hotels') },
        { key: 'bookings', icon: <ShopOutlined />, label: '预订查询', onClick: () => navigate('/bookings') },
        { key: 'statistics', icon: <ShopOutlined />, label: '收入统计', onClick: () => navigate('/statistics') },
      ];

  const fetchHotels = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { role: user.role, userId: user.id };
      if (user.role === 'merchant') params.merchantId = user.id;

      const response = await get('http://localhost:3000/api/hotels', { params });
      if (response.data.code === 200) {
        setHotels(response.data.data || []);
      } else {
        message.error(response.data.message || '获取酒店列表失败');
      }
    } catch (error) {
      message.error('获取酒店列表失败');
      console.error('fetchHotels error:', error);
    } finally {
      setLoading(false);
    }
  }, [get, user.role, user.id]);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await removeHotel(`http://localhost:3000/api/hotels/${id}`, {
        params: { role: user.role, userId: user.id },
      });
      message.success('删除成功');
      fetchHotels();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  }, [removeHotel, user.role, user.id, fetchHotels]);

  const handleApproveHotel = useCallback(async (id: string, status: string) => {
    try {
      await put(`http://localhost:3000/api/hotels/${id}`, { status }, {
        params: { role: user.role, userId: user.id },
      });
      message.success('酒店审核完成');
      fetchHotels();
    } catch (error: any) {
      message.error(error.response?.data?.message || '酒店审核失败');
    }
  }, [put, user.role, user.id, fetchHotels]);

  const handleAdAction = useCallback(async (id: string, payload: any, successText: string) => {
    try {
      await put(`http://localhost:3000/api/hotels/${id}/home-ad`, payload, {
        params: { role: user.role, userId: user.id },
      });
      message.success(successText);
      fetchHotels();
    } catch (error: any) {
      message.error(error.response?.data?.message || '广告操作失败');
    }
  }, [put, user.role, user.id, fetchHotels]);

  const handleUpdateStarLevel = useCallback(async (id: string, starLevel: number) => {
    try {
      await put(API_ENDPOINTS.hotels.updateStarLevel(id), { starLevel });
      message.success('酒店钻级更新成功');
      fetchHotels();
    } catch (error: any) {
      message.error(error.response?.data?.message || '酒店钻级更新失败');
    }
  }, [put, fetchHotels]);

  const columns = [
    { title: '酒店名称', dataIndex: 'name', key: 'name' },
    { title: '城市', dataIndex: 'city', key: 'city' },
    {
      title: '钻级',
      dataIndex: 'starLevel',
      key: 'starLevel',
      render: (starLevel?: number) => (Number.isInteger(starLevel) ? `${starLevel}钻` : '-'),
    },
    {
      title: '价格/晚',
      dataIndex: 'pricePerNight',
      key: 'pricePerNight',
      render: (price: number) => `¥${price}`,
    },
    { title: '房间数', dataIndex: 'totalRooms', key: 'totalRooms' },
    {
      title: '酒店状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const map: Record<string, ReactNode> = {
          pending: <Tag color='orange'>待审核</Tag>,
          approved: <Tag color='green'>已批准</Tag>,
          rejected: <Tag color='red'>已拒绝</Tag>,
          draft: <Tag>草稿</Tag>,
        };
        return map[status] || status;
      },
    },
    {
      title: '广告状态',
      dataIndex: 'adStatus',
      key: 'adStatus',
      render: (_: string, record: Hotel) => {
        if (record.isHomeAd) return <Tag color='green'>投放中</Tag>;
        const map: Record<string, ReactNode> = {
          pending: <Tag color='orange'>待审核</Tag>,
          approved: <Tag color='blue'>已通过</Tag>,
          rejected: <Tag color='red'>已拒绝</Tag>,
          none: <Tag>未申请</Tag>,
        };
        return map[record.adStatus || 'none'];
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Hotel) => {
        if (user.role === 'admin') {
          return (
            <Space>
              <Button
                type='primary'
                size='small'
                onClick={() => handleApproveHotel(record.id, record.status === 'pending' ? 'approved' : 'pending')}
              >
                {record.status === 'pending' ? '批准酒店' : '撤销批准'}
              </Button>
              <Button danger size='small' onClick={() => handleApproveHotel(record.id, 'rejected')}>
                拒绝酒店
              </Button>
              <Button
                type='dashed'
                size='small'
                disabled={record.adStatus !== 'pending'}
                onClick={() => handleAdAction(record.id, { reviewStatus: 'approved' }, '广告审核通过')}
              >
                通过广告
              </Button>
              <Select
                size='small'
                value={record.starLevel || undefined}
                placeholder='设置钻级'
                style={{ width: 110 }}
                options={[1, 2, 3, 4, 5].map(level => ({ label: `${level}钻`, value: level }))}
                onChange={(value: number) => handleUpdateStarLevel(record.id, value)}
              />
              <Button
                danger
                size='small'
                disabled={record.adStatus !== 'pending'}
                onClick={() => handleAdAction(record.id, { reviewStatus: 'rejected' }, '广告已拒绝')}
              >
                拒绝广告
              </Button>
            </Space>
          );
        }

        return (
          <Space>
            <Button type='primary' size='small' icon={<EditOutlined />} onClick={() => navigate(`/hotels/${record.id}`)}>
              编辑
            </Button>
            <Popconfirm title='确定删除?' onConfirm={() => handleDelete(record.id)}>
              <Button danger size='small' icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
            {record.adStatus === 'pending' || record.isHomeAd ? (
              <Button size='small' onClick={() => handleAdAction(record.id, { enabled: false }, '已取消广告申请')}>
                取消广告
              </Button>
            ) : (
              <Button type='dashed' size='small' onClick={() => handleAdAction(record.id, { enabled: true }, '广告申请已提交')}>
                申请广告
              </Button>
            )}
          </Space>
        );
      },
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
          <h2 style={{ margin: 0, color: 'white' }}>{user.role === 'admin' ? '酒店审核' : '我的酒店'}</h2>
          <Button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
            返回
          </Button>
        </Header>

        <Content style={{ padding: '20px', background: '#f0f2f5' }}>
          {user.role === 'merchant' && (
            <div style={{ marginBottom: '20px' }}>
              <Button type='primary' icon={<PlusOutlined />} onClick={() => navigate('/hotels/new')}>
                新增酒店
              </Button>
            </div>
          )}

          <div style={{ background: 'white', padding: '20px', borderRadius: '4px' }}>
            <Spin spinning={loading}>
              <Table columns={columns} dataSource={hotels} loading={loading} rowKey='id' />
            </Spin>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default HotelList;
