import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adsAPI } from '@/lib/api';
import { toast } from 'sonner';
import {
  Facebook,
  Search,
  Play,
  Pause,
  RefreshCw,
  TrendingUp,
  Users,
  MousePointer,
  DollarSign,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  budget: number;
  targetAudience: string;
  objectives: string[];
  status: string;
  city?: string;
  serviceType?: string;
  landingPageSlug?: string;
  // Add Meta/Google IDs when campaigns are created
  metaCampaignId?: string;
  googleCampaignId?: string;
}

interface AdsManagerProps {
  campaign: Campaign;
  onRefresh?: () => void;
}

interface AdMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  cpc: number;
  cpl: number;
}

export default function AdsManager({ campaign, onRefresh }: AdsManagerProps) {
  const [loading, setLoading] = useState(false);
  const [metaMetrics, setMetaMetrics] = useState<AdMetrics | null>(null);
  const [googleMetrics, setGoogleMetrics] = useState<AdMetrics | null>(null);
  const [connectionStatus, setConnectionStatus] = useState({
    meta: 'untested' as 'untested' | 'testing' | 'connected' | 'error',
    google: 'untested' as 'untested' | 'testing' | 'connected' | 'error'
  });

  const testConnections = async () => {
    // Test Meta connection
    setConnectionStatus(prev => ({ ...prev, meta: 'testing' }));
    try {
      await adsAPI.testMetaConnection();
      setConnectionStatus(prev => ({ ...prev, meta: 'connected' }));
      toast.success('Meta Ads API connected successfully');
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, meta: 'error' }));
      console.error('Meta connection error:', error);
    }

    // Test Google connection
    setConnectionStatus(prev => ({ ...prev, google: 'testing' }));
    try {
      await adsAPI.testGoogleConnection();
      setConnectionStatus(prev => ({ ...prev, google: 'connected' }));
      toast.success('Google Ads API connected successfully');
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, google: 'error' }));
      console.error('Google connection error:', error);
    }
  };

  const createMetaCampaign = async (type: 'standard' | 'leadgen') => {
    setLoading(true);
    try {
      const campaignData = {
        name: campaign.name,
        budget: campaign.budget,
        objectives: campaign.objectives,
        targetAudience: campaign.targetAudience,
        landingPageSlug: campaign.landingPageSlug || 'therapy',
        ...(type === 'leadgen' && { city: campaign.city })
      };

      const response = type === 'standard'
        ? await adsAPI.meta.createCampaign(campaignData)
        : await adsAPI.meta.createLeadGenCampaign(campaignData);

      toast.success(`Meta ${type} campaign created successfully!`);
      console.log('Meta Campaign Created:', response.data);

      // You might want to update the campaign in the database with the metaCampaignId
      // await campaignsAPI.update(campaign.id, { metaCampaignId: response.data.data.campaignId });

      onRefresh?.();
    } catch (error: any) {
      toast.error(`Failed to create Meta campaign: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createGoogleCampaign = async (type: 'standard' | 'psychology') => {
    setLoading(true);
    try {
      const campaignData = {
        name: campaign.name,
        budget: campaign.budget,
        ...(type === 'psychology' && {
          serviceType: campaign.serviceType,
          city: campaign.city,
          averageTicket: 150
        })
      };

      const response = type === 'standard'
        ? await adsAPI.google.createCampaign(campaignData)
        : await adsAPI.google.createPsychologyCampaign(campaignData);

      toast.success(`Google ${type} campaign created successfully!`);
      console.log('Google Campaign Created:', response.data);

      // You might want to update the campaign in the database with the googleCampaignId
      // await campaignsAPI.update(campaign.id, { googleCampaignId: response.data.data.campaignId });

      onRefresh?.();
    } catch (error: any) {
      toast.error(`Failed to create Google campaign: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getMetrics = async (platform: 'meta' | 'google') => {
    setLoading(true);
    try {
      const campaignId = platform === 'meta' ? campaign.metaCampaignId : campaign.googleCampaignId;

      if (!campaignId) {
        toast.error(`No ${platform} campaign ID found`);
        return;
      }

      const response = platform === 'meta'
        ? await adsAPI.meta.getCampaignMetrics(campaignId)
        : await adsAPI.google.getCampaignMetrics(campaignId);

      const metrics = response.data.data;

      if (platform === 'meta') {
        setMetaMetrics(metrics);
      } else {
        setGoogleMetrics(metrics);
      }

      toast.success(`${platform} metrics refreshed`);
    } catch (error: any) {
      toast.error(`Failed to get ${platform} metrics: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const pauseCampaign = async (platform: 'meta' | 'google') => {
    setLoading(true);
    try {
      const campaignId = platform === 'meta' ? campaign.metaCampaignId : campaign.googleCampaignId;

      if (!campaignId) {
        toast.error(`No ${platform} campaign ID found`);
        return;
      }

      if (platform === 'meta') {
        await adsAPI.meta.pauseCampaign(campaignId);
      } else {
        await adsAPI.google.pauseCampaign(campaignId);
      }

      toast.success(`${platform} campaign paused`);
      onRefresh?.();
    } catch (error: any) {
      toast.error(`Failed to pause ${platform} campaign: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: typeof connectionStatus.meta) => {
    switch (status) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const MetricsCard = ({ title, metrics, platform }: { title: string, metrics: AdMetrics | null, platform: 'meta' | 'google' }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => getMetrics(platform)}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {metrics ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-2xl font-bold">{metrics.impressions.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Impressions</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <MousePointer className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold">{metrics.clicks.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Clicks</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-2xl font-bold">{metrics.conversions}</span>
              </div>
              <p className="text-xs text-muted-foreground">Conversions</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-red-600" />
                <span className="text-2xl font-bold">${metrics.cost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Spend</p>
            </div>
            <div className="col-span-2 grid grid-cols-3 gap-2 pt-2 border-t">
              <div className="text-center">
                <div className="text-sm font-semibold">{(metrics.ctr * 100).toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground">CTR</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">${metrics.cpc.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">CPC</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold">${metrics.cpl.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">CPL</div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No metrics available. Create a campaign first.</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Ads Platform Integration
            <Button variant="outline" size="sm" onClick={testConnections}>
              Test Connections
            </Button>
          </CardTitle>
          <CardDescription>
            Manage your campaigns across Meta Ads and Google Ads platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Facebook className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="font-medium">Meta Ads</div>
                <div className="text-sm text-muted-foreground">Facebook & Instagram</div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(connectionStatus.meta)}
                <Badge variant={connectionStatus.meta === 'connected' ? 'default' : 'secondary'}>
                  {connectionStatus.meta}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Search className="h-5 w-5 text-green-600" />
              <div className="flex-1">
                <div className="font-medium">Google Ads</div>
                <div className="text-sm text-muted-foreground">Search & Display</div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(connectionStatus.google)}
                <Badge variant={connectionStatus.google === 'connected' ? 'default' : 'secondary'}>
                  {connectionStatus.google}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="meta" className="space-y-4">
        <TabsList>
          <TabsTrigger value="meta">Meta Ads</TabsTrigger>
          <TabsTrigger value="google">Google Ads</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Meta Campaign Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  Meta Campaign Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!campaign.metaCampaignId ? (
                  <div className="space-y-3">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No Meta campaign found. Create one to start advertising on Facebook and Instagram.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        onClick={() => createMetaCampaign('standard')}
                        disabled={loading || connectionStatus.meta !== 'connected'}
                        className="justify-start"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Create Standard Campaign
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => createMetaCampaign('leadgen')}
                        disabled={loading || connectionStatus.meta !== 'connected'}
                        className="justify-start"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        Create Lead Generation Campaign
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Meta campaign is active (ID: {campaign.metaCampaignId})
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pauseCampaign('meta')}
                        disabled={loading}
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Campaign
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => getMetrics('meta')}
                        disabled={loading}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Metrics
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meta Metrics */}
            <MetricsCard title="Meta Ads Performance" metrics={metaMetrics} platform="meta" />
          </div>
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Google Campaign Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-green-600" />
                  Google Ads Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!campaign.googleCampaignId ? (
                  <div className="space-y-3">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No Google Ads campaign found. Create one to start advertising on Google Search.
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        onClick={() => createGoogleCampaign('standard')}
                        disabled={loading || connectionStatus.google !== 'connected'}
                        className="justify-start"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                        Create Search Campaign
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => createGoogleCampaign('psychology')}
                        disabled={loading || connectionStatus.google !== 'connected'}
                        className="justify-start"
                      >
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                        Create Psychology Campaign
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Google Ads campaign is active (ID: {campaign.googleCampaignId})
                      </AlertDescription>
                    </Alert>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => pauseCampaign('google')}
                        disabled={loading}
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Campaign
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => getMetrics('google')}
                        disabled={loading}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh Metrics
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Google Metrics */}
            <MetricsCard title="Google Ads Performance" metrics={googleMetrics} platform="google" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}