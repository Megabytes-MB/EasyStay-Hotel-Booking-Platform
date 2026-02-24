import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined, ReloadOutlined, ShopOutlined } from '@ant-design/icons';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config';

const { Header, Sider, Content } = Layout;

interface HolidayRule {
  id: number;
  name: string;
  holidayType: 'official' | 'custom' | 'campaign' | string;
  startDate: string;
  endDate: string;
  discountRate: number;
  isActive: boolean;
  isAutoSynced: boolean;
  source: string;
  syncYear?: number | null;
  notes?: string | null;
}

function HolidayList() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const api = useApi({ showMessage: false });

  const [rules, setRules] = useState<HolidayRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<HolidayRule | null>(null);
  const [syncYear, setSyncYear] = useState<number>(new Date().getFullYear());

  const user = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

  const menuItems = user.role === 'admin'
    ? [
        { key: 'review', icon: <ShopOutlined />, label: '酒店审核', onClick: () => navigate('/hotels') },
        { key: 'statistics', icon: <ShopOutlined />, label: '收入统计', onClick: () => navigate('/statistics') },
        { key: 'holidays', icon: <ShopOutlined />, label: '节假日活动', onClick: () => navigate('/holidays') },
      ]
    : [
        { key: 'hotels', icon: <ShopOutlined />, label: '我的酒店', onClick: () => navigate('/hotels') },
        { key: 'bookings', icon: <ShopOutlined />, label: '预订查询', onClick: () => navigate('/bookings') },
        { key: 'statistics', icon: <ShopOutlined />, label: '收入统计', onClick: () => navigate('/statistics') },
      ];

  const fetchRules = useCallback(async () => {
    if (user.role !== 'admin') return;
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.holidays.manage);
      if (response?.data?.code === 200) {
        setRules(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        message.error(response?.data?.message || '获取节假日配置失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '获取节假日配置失败');
    } finally {
      setLoading(false);
    }
  }, [api, user.role]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const openCreateModal = () => {
    setEditingRule(null);
    form.setFieldsValue({
      name: '',
      holidayType: 'custom',
      startDate: '',
      endDate: '',
      discountRate: 0.9,
      isActive: true,
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (record: HolidayRule) => {
    setEditingRule(record);
    form.setFieldsValue({
      name: record.name,
      holidayType: record.holidayType,
      startDate: record.startDate,
      endDate: record.endDate,
      discountRate: Number(record.discountRate || 0.9),
      isActive: record.isActive,
      notes: record.notes || '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await api.delete(API_ENDPOINTS.holidays.delete(id));
      if (response?.data?.code === 200) {
        message.success('删除成功');
        fetchRules();
      } else {
        message.error(response?.data?.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '删除失败');
    }
  };

  const handleSync = async () => {
    try {
      setSyncLoading(true);
      const response = await api.post(API_ENDPOINTS.holidays.sync, { year: syncYear });
      if (response?.data?.code === 200) {
        message.success(response.data.message || '同步成功');
        fetchRules();
      } else {
        message.error(response?.data?.message || '同步失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '同步失败');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        discountRate: Number(values.discountRate),
      };

      const response = editingRule
        ? await api.put(API_ENDPOINTS.holidays.update(editingRule.id), payload)
        : await api.post(API_ENDPOINTS.holidays.create, payload);

      if (response?.data?.code === 200) {
        message.success(editingRule ? '更新成功' : '新增成功');
        setModalOpen(false);
        fetchRules();
      } else {
        message.error(response?.data?.message || '保存失败');
      }
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(error?.response?.data?.message || '保存失败');
    }
  };

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'holidayType',
      key: 'holidayType',
      render: (type: HolidayRule['holidayType']) => {
        if (type === 'official') return <Tag color='blue'>法定节假日</Tag>;
        if (type === 'campaign') return <Tag color='magenta'>平台活动</Tag>;
        return <Tag color='green'>自定义节日</Tag>;
      },
    },
    {
      title: '日期范围',
      key: 'dateRange',
      render: (_: unknown, record: HolidayRule) => `${record.startDate} ~ ${record.endDate}`,
    },
    {
      title: '折扣',
      dataIndex: 'discountRate',
      key: 'discountRate',
      render: (rate: number) => `${Math.round(Number(rate) * 1000) / 100} 折`,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (isActive ? <Tag color='success'>启用</Tag> : <Tag>停用</Tag>),
    },
    {
      title: '来源',
      key: 'source',
      render: (_: unknown, record: HolidayRule) => {
        if (record.isAutoSynced) {
          return <Tag color='gold'>自动同步 {record.syncYear || ''}</Tag>;
        }
        return <Tag>手动配置</Tag>;
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, record: HolidayRule) => (
        <Space>
          <Button size='small' type='primary' onClick={() => openEditModal(record)}>
            编辑
          </Button>
          <Popconfirm title='确定删除该规则吗？' onConfirm={() => handleDelete(record.id)}>
            <Button size='small' danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (user.role !== 'admin') {
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme='dark' width={200}>
        <div style={{ color: 'white', padding: '20px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
          易宿酒店后台
        </div>
        <Menu theme='dark' mode='inline' selectedKeys={['holidays']} items={menuItems} />
      </Sider>

      <Layout>
        <Header style={{ background: '#1890ff', color: 'white', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: 'white' }}>节假日与活动配置</h2>
          <Button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
            返回
          </Button>
        </Header>

        <Content style={{ padding: '20px', background: '#f0f2f5' }}>
          <div style={{ background: 'white', padding: '20px', borderRadius: '4px' }}>
            <Space style={{ marginBottom: 16 }} wrap>
              <Button type='primary' icon={<PlusOutlined />} onClick={openCreateModal}>
                手动新增节假日/活动
              </Button>

              <InputNumber
                min={2000}
                max={2100}
                value={syncYear}
                onChange={(value: number | null) =>
                  setSyncYear(Number(value || new Date().getFullYear()))
                }
              />
              <Button icon={<ReloadOutlined />} loading={syncLoading} onClick={handleSync}>
                同步法定节假日
              </Button>
            </Space>

            <Table
              rowKey='id'
              columns={columns}
              dataSource={rules}
              loading={loading}
            />
          </div>
        </Content>
      </Layout>

      <Modal
        title={editingRule ? '编辑节假日/活动' : '新增节假日/活动'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText='保存'
        cancelText='取消'
        destroyOnClose
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            label='名称'
            name='name'
            rules={[{ required: true, message: '请输入名称' }]}
          >
            <Input placeholder='例如：国庆节、双11、周年庆' />
          </Form.Item>

          <Form.Item
            label='类型'
            name='holidayType'
            rules={[{ required: true, message: '请选择类型' }]}
          >
            <Select
              options={[
                { label: '法定节假日', value: 'official' },
                { label: '自定义节日', value: 'custom' },
                { label: '平台活动', value: 'campaign' },
              ]}
            />
          </Form.Item>

          <Form.Item
            label='开始日期'
            name='startDate'
            rules={[
              { required: true, message: '请输入开始日期' },
              { pattern: /^\d{4}-\d{2}-\d{2}$/, message: '格式为 YYYY-MM-DD' },
            ]}
          >
            <Input type='date' />
          </Form.Item>

          <Form.Item
            label='结束日期'
            name='endDate'
            rules={[
              { required: true, message: '请输入结束日期' },
              { pattern: /^\d{4}-\d{2}-\d{2}$/, message: '格式为 YYYY-MM-DD' },
            ]}
          >
            <Input type='date' />
          </Form.Item>

          <Form.Item
            label='折扣系数'
            name='discountRate'
            rules={[{ required: true, message: '请输入折扣系数' }]}
          >
            <InputNumber min={0.01} max={1} step={0.01} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label='启用' name='isActive' valuePropName='checked'>
            <Switch />
          </Form.Item>

          <Form.Item label='备注' name='notes'>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default HolidayList;
