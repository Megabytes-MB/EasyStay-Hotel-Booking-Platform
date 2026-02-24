import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Layout,
  List,
  Space,
  Typography,
  Upload,
  message,
} from 'antd';
import { EnvironmentOutlined, SearchOutlined, UploadOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { API_ENDPOINTS } from '../config';

const { Header, Content } = Layout;
const { Text } = Typography;

interface MapPoint {
  id: string;
  title: string;
  address: string;
  province: string;
  city: string;
  district: string;
  longitude: number;
  latitude: number;
}

function HotelForm() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const api = useApi({ showMessage: false });
  const mapApi = useApi({ showMessage: false });

  const [mapKeyword, setMapKeyword] = useState('');
  const [mapPoints, setMapPoints] = useState<MapPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchHotelDetail();
    }
  }, [id]);

  const fetchHotelDetail = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.hotels.detail(id!));
      const hotel = response?.data?.data;

      if (!hotel) {
        message.error('获取酒店信息失败');
        return;
      }

      form.setFieldsValue({
        ...hotel,
        imagesText: Array.isArray(hotel.images) ? hotel.images.join('\n') : '',
      });
      const lng = Number(hotel.longitude);
      const lat = Number(hotel.latitude);
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        setSelectedPoint({
          id: String(hotel.id || 'saved-point'),
          title: hotel.name || '已保存点位',
          address: hotel.location || '',
          province: '',
          city: hotel.city || '',
          district: '',
          longitude: lng,
          latitude: lat,
        });
      }
    } catch (error) {
      console.error('fetchHotelDetail error:', error);
      message.error('获取酒店信息失败');
    }
  };

  const handleSearchMapPoint = async () => {
    const keyword = mapKeyword.trim();
    if (!keyword) {
      message.warning('请输入要搜索的地点关键词');
      return;
    }

    try {
      const region = String(form.getFieldValue('city') || '').trim();
      const response = await mapApi.get(API_ENDPOINTS.map.search, {
        params: {
          keyword,
          region,
          pageSize: 10,
        },
      });

      if (response?.data?.code === 200) {
        const points = Array.isArray(response.data.data) ? response.data.data : [];
        setMapPoints(points);
        if (points.length === 0) {
          message.info('未找到匹配地点，请尝试更精确的关键词');
        }
      } else {
        message.error(response?.data?.message || '地点搜索失败');
      }
    } catch (error: any) {
      console.error('handleSearchMapPoint error:', error);
      message.error(error?.response?.data?.message || '地点搜索失败');
    }
  };

  const handleSelectPoint = (point: MapPoint) => {
    setSelectedPoint(point);
    form.setFieldsValue({
      location: point.address || point.title,
      city: point.city || form.getFieldValue('city'),
      longitude: point.longitude,
      latitude: point.latitude,
    });
    message.success('已选中地点并回填坐标');
  };

  const onFinish = async (values: any) => {
    const longitude = Number(values.longitude);
    const latitude = Number(values.latitude);
    const hasLongitude = values.longitude !== undefined && values.longitude !== null && values.longitude !== '';
    const hasLatitude = values.latitude !== undefined && values.latitude !== null && values.latitude !== '';
    const hasCoordinate = Number.isFinite(longitude) && Number.isFinite(latitude);
    const isCreateMode = !id || id === 'new';

    if (hasLongitude !== hasLatitude) {
      message.error('经纬度必须同时提供');
      return;
    }

    if ((hasLongitude || hasLatitude) && !hasCoordinate) {
      message.error('经纬度格式不正确');
      return;
    }

    if (isCreateMode && !hasCoordinate) {
      message.error('请先通过地图搜索并选点，获取有效经纬度');
      return;
    }

    const images = String(values.imagesText || '')
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      ...values,
      images,
    };
    delete payload.imagesText;
    if (hasCoordinate) {
      payload.longitude = longitude;
      payload.latitude = latitude;
    } else {
      delete payload.longitude;
      delete payload.latitude;
    }

    try {
      let result;

      if (id && id !== 'new') {
        result = await api.put(API_ENDPOINTS.hotels.update(id), payload, {
          params: {
            role: user.role,
            userId: user.id,
          },
        });
      } else {
        result = await api.post(API_ENDPOINTS.hotels.create, payload);
      }

      if (result?.data?.code === 200) {
        message.success(id && id !== 'new' ? '酒店信息已更新' : '酒店已成功创建');
        setTimeout(() => navigate('/hotels'), 400);
      } else {
        message.error(result?.data?.message || '提交失败');
      }
    } catch (error: any) {
      message.error(error?.response?.data?.message || '提交失败');
    }
  };

  const handleUploadImage = async (file: File) => {
    if (!file.type || !file.type.startsWith('image/')) {
      message.error('请上传图片文件（jpg/png/webp 等）');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      message.error('图片大小不能超过 5MB');
      return false;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post(API_ENDPOINTS.hotels.uploadImage, formData);

      const uploadedUrl = response?.data?.data?.url;
      if (!uploadedUrl) {
        message.error('上传成功但未返回图片地址');
        return;
      }

      const previous = String(form.getFieldValue('imagesText') || '').trim();
      const nextValue = previous ? `${previous}\n${uploadedUrl}` : uploadedUrl;
      form.setFieldsValue({ imagesText: nextValue });
      message.success('图片上传成功，已自动填入 URL');
    } catch (error: any) {
      message.error(error?.response?.data?.message || '图片上传失败');
    } finally {
      setUploadingImage(false);
    }

    return false;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#1890ff',
          color: 'white',
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <h2 style={{ margin: 0, color: 'white' }}>
          {id && id !== 'new' ? '编辑酒店' : '新增酒店'}
        </h2>
      </Header>

      <Content style={{ padding: '20px', background: '#f0f2f5' }}>
        <Card style={{ maxWidth: '760px', margin: '0 auto' }}>
          <Form form={form} layout='vertical' onFinish={onFinish}>
            <Form.Item
              label='酒店名称'
              name='name'
              rules={[
                { required: true, message: '请输入酒店名称' },
                { min: 2, message: '酒店名称至少 2 个字符' },
                { max: 50, message: '酒店名称最多 50 个字符' },
              ]}
            >
              <Input placeholder='例如：易宿精选酒店' />
            </Form.Item>

            <Form.Item label='描述' name='description'>
              <Input.TextArea placeholder='酒店描述' rows={3} />
            </Form.Item>

            <Form.Item
              label='城市'
              name='city'
              rules={[
                { required: true, message: '请输入城市' },
                { min: 2, message: '城市名至少 2 个字符' },
              ]}
            >
              <Input placeholder='例如：上海' />
            </Form.Item>

            <Form.Item
              label='详细地址'
              name='location'
              rules={[
                { required: true, message: '请先在下方搜索并选择地点' },
                { min: 5, message: '地址至少 5 个字符' },
              ]}
            >
              <Input placeholder='建议通过地图选点自动回填' />
            </Form.Item>

            <Form.Item label='地图选点'>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={mapKeyword}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setMapKeyword(event.target.value)}
                  placeholder='输入地标/商圈/街道，例如：静安寺'
                  onPressEnter={handleSearchMapPoint}
                />
                <Button
                  icon={<SearchOutlined />}
                  loading={mapApi.loading}
                  onClick={handleSearchMapPoint}
                >
                  搜索地点
                </Button>
              </Space.Compact>

              {selectedPoint && (
                <Alert
                  style={{ marginTop: 12 }}
                  type='success'
                  showIcon
                  icon={<EnvironmentOutlined />}
                  message={`已选点：${selectedPoint.title || selectedPoint.address}`}
                  description={
                    <>
                      <div>{selectedPoint.address || '无详细地址'}</div>
                      <div>
                        经纬度：{selectedPoint.longitude}, {selectedPoint.latitude}
                      </div>
                    </>
                  }
                />
              )}

              {mapPoints.length > 0 && (
                <List
                  style={{ marginTop: 12, border: '1px solid #f0f0f0', borderRadius: 6 }}
                  size='small'
                  dataSource={mapPoints}
                  renderItem={(item: MapPoint) => (
                    <List.Item
                      actions={[
                        <Button key={item.id} size='small' type='link' onClick={() => handleSelectPoint(item)}>
                          选此点
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        title={item.title || item.address || '未命名地点'}
                        description={
                          <>
                            <div>{item.address || '无详细地址'}</div>
                            <Text type='secondary'>
                              {item.city || '-'} {item.district || '-'} | {item.longitude}, {item.latitude}
                            </Text>
                          </>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Form.Item>

            <Form.Item
              label='每晚价格（元）'
              name='pricePerNight'
              rules={[
                { required: true, message: '请输入每晚价格' },
                {
                  validator: (_: unknown, value: string | number) => {
                    if (!value || Number(value) > 0) return Promise.resolve();
                    return Promise.reject(new Error('价格必须大于 0'));
                  },
                },
              ]}
            >
              <Input type='number' placeholder='例如：599' />
            </Form.Item>

            <Form.Item
              label='酒店星级评分（0-5）'
              name='rating'
              rules={[
                {
                  validator: (_: unknown, value: string | number) => {
                    if (value === undefined || value === null || value === '') return Promise.resolve();
                    const score = Number(value);
                    if (Number.isFinite(score) && score >= 0 && score <= 5) return Promise.resolve();
                    return Promise.reject(new Error('评分必须在 0 到 5 之间'));
                  },
                },
              ]}
            >
              <Input type='number' step='0.1' min={0} max={5} placeholder='例如：4.6' />
            </Form.Item>

            <Form.Item label='酒店图片 URL（每行一条，或逗号分隔）' name='imagesText'>
              <Input.TextArea
                rows={4}
                placeholder={'https://example.com/hotel1.jpg\nhttps://example.com/hotel2.jpg'}
              />
            </Form.Item>

            <Form.Item label='上传酒店图片'>
              <Upload
                accept='image/*'
                showUploadList={false}
                beforeUpload={(file) => handleUploadImage(file as File)}
              >
                <Button icon={<UploadOutlined />} loading={uploadingImage}>
                  选择图片并上传
                </Button>
              </Upload>
            </Form.Item>

            <Form.Item
              label='总房间数'
              name='totalRooms'
              rules={[
                {
                  validator: (_: unknown, value: string | number) => {
                    if (!value || Number(value) >= 0) return Promise.resolve();
                    return Promise.reject(new Error('房间数不能小于 0'));
                  },
                },
              ]}
            >
              <Input type='number' placeholder='例如：150' />
            </Form.Item>

            <Form.Item label='可用房间数' name='availableRooms'>
              <Input type='number' placeholder='例如：45' />
            </Form.Item>

            <Form.Item
              label='电话'
              name='phoneNumber'
              rules={[
                {
                  pattern: /^1[3-9]\d{9}$/,
                  message: '请输入有效的手机号',
                },
              ]}
            >
              <Input placeholder='例如：13800138000' />
            </Form.Item>

            <Form.Item name='longitude' hidden>
              <Input />
            </Form.Item>
            <Form.Item name='latitude' hidden>
              <Input />
            </Form.Item>

            <Form.Item>
              <Button type='primary' htmlType='submit' loading={api.loading}>
                {id && id !== 'new' ? '更新' : '创建'}
              </Button>
              <Button style={{ marginLeft: 10 }} onClick={() => navigate('/hotels')}>
                取消
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}

export default HotelForm;
