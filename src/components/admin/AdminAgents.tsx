import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Plus, Eye } from 'lucide-react';

type Agent = {
  id: string;
  agent_code: string;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  trade_licence_file: string;
  trade_licence: string;
  pan: string;
  pan_file: any;
  aadhaar_file: any;
  aadhaar: string;
  status: string;
  commission_rate: number;
  created_at: string;
};

export const AdminAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    commission_rate: 5.0,
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    trade_licence: '', 
    trade_licence_file: '',
    pan: '',
    pan_file: '',
    aadhaar: '',
    aadhaar_file: ''
  });
  const { toast } = useToast();
  const [showCredentials, setShowCredentials] = useState<{email: string, password: string} | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      toast({
        title: "Error fetching agents",
        description: "Failed to load agents data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingAgent) {
        const { error } = await supabase
          .from('agents')
          .update(formData)
          .eq('id', editingAgent.id);

        if (error) throw error;

        toast({
          title: "Agent updated successfully",
          description: "The agent information has been updated.",
        });
      } else {
        // Generate temporary password
        const tempPassword = 'Agent' + Math.random().toString(36).slice(-6) + '2024!';
        
        try {
          // Call edge function to create user and agent
          const { data, error } = await supabase.functions.invoke('create-agent-user', {
            body: {
              email: formData.email,
              agentData: formData
            }
          });

          if (error) throw error;

          // Store credentials to display
          setShowCredentials({
            email: formData.email,
            password: data?.tempPassword || tempPassword
          });

          toast({
            title: "Agent created successfully",
            description: "Login credentials generated. Please save them securely.",
          });
        } catch (edgeFunctionError) {
          // Fallback: Create agent without user account
          const { data: codeData, error: codeError } = await supabase
            .rpc('generate_agent_code');

          if (codeError) throw codeError;

          const { error } = await supabase
            .from('agents')
            .insert({
              ...formData,
              agent_code: codeData,
              user_id: null,
            });

          if (error) throw error;

          // Store credentials to display
          setShowCredentials({
            email: formData.email,
            password: tempPassword
          });

          toast({
            title: "Agent created successfully",
            description: "Agent created. Login will need to be set up manually.",
          });
        }
      }

      setIsDialogOpen(false);
      setEditingAgent(null);
      resetForm();
      fetchAgents();
      
      // Don't close credentials dialog on creation
      if (!editingAgent && showCredentials) {
        // Keep credentials modal open
        return;
      }
    } catch (error) {
      toast({
        title: "Error saving agent",
        description: "Failed to save agent information.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (agent: Agent) => {
    setViewingAgent(null);
    setEditingAgent(agent);
    setFormData({
      company_name: agent.company_name,
      contact_person: agent.contact_person,
      email: agent.email,
      phone: agent.phone,
      commission_rate: agent.commission_rate,
      address: agent.address || '',
      city: agent.city || '',
      state: agent.state || '',
      country: agent.country || '',
      pincode: agent.pincode || '',
      trade_licence: agent.trade_licence || '',
      trade_licence_file: agent.trade_licence_file || '',
      pan: '',
      pan_file: '',
      aadhaar: '',
      aadhaar_file: ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Agent deleted successfully",
        description: "The agent has been removed from the system.",
      });
      fetchAgents();
    } catch (error) {
      toast({
        title: "Error deleting agent",
        description: "Failed to delete the agent.",
        variant: "destructive",
      });
    }
  };
  const updateAgentStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("agents")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Agent status changed to ${newStatus}`,
      });

      fetchAgents();            // refresh table
      setViewingAgent((prev) =>
        prev ? { ...prev, status: newStatus } : prev
      );

    } catch (error) {
      toast({
        title: "Error updating status",
        description: "Could not update agent status.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      email: '',
      phone: '',
      commission_rate: 5.0,
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      trade_licence: '', 
      trade_licence_file: '',
      pan: '',
      pan_file: '',
      aadhaar: '',
      aadhaar_file: ''
    });
  };

  const openCreateDialog = () => {
    setEditingAgent(null);
    resetForm();
    setIsDialogOpen(true);
  };

  if (loading) {
    return <div className="text-center py-8">Loading agents...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Agents Management</CardTitle>
            <CardDescription>
              Manage travel agents in the system
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setViewingAgent(null); openCreateDialog(); }} >
                <Plus className="h-4 w-4 mr-2" />
                Add Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                </DialogTitle>
                <DialogDescription>
                  {editingAgent ? 'Update agent information' : 'Add a new travel agent to the system'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name</Label>
                    <Input
                      id="company_name"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_person">Contact Person</Label>
                    <Input
                      id="contact_person"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commission_rate">Commission Rate (%)</Label>
                    <Input
                      id="commission_rate"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.commission_rate}
                      onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Credentials Display Dialog */}
        {showCredentials && (
          <Dialog open={!!showCredentials} onOpenChange={() => setShowCredentials(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Agent Login Credentials</DialogTitle>
                <DialogDescription>
                  Save these credentials securely. The agent can use them to login.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <Label className="text-sm font-medium">Email:</Label>
                      <div className="mt-1 p-2 bg-background rounded border font-mono text-sm">
                        {showCredentials.email}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Password:</Label>
                      <div className="mt-1 p-2 bg-background rounded border font-mono text-sm">
                        {showCredentials.password}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  The agent can login at the Agent Portal with these credentials.
                </div>
                <Button 
                  onClick={() => setShowCredentials(null)}
                  className="w-full"
                >
                  I've Saved the Credentials
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* View Agent Details Dialog */}
        {viewingAgent && (
          <Dialog open={!!viewingAgent} onOpenChange={() => setViewingAgent(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Agent Details</DialogTitle>
                <DialogDescription>
                  Full profile information of the selected agent.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Agent Code</Label>
                    <p>{viewingAgent.agent_code}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Status</Label>
                    <p className="capitalize">{viewingAgent.status}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Company</Label>
                    <p>{viewingAgent.company_name}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Contact Person</Label>
                    <p>{viewingAgent.contact_person}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Email</Label>
                    <p>{viewingAgent.email}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Phone</Label>
                    <p>{viewingAgent.phone}</p>
                  </div>

                  {/* Address Section */}
                  <div className="col-span-2">
                    <Label className="font-semibold">Address</Label>
                    <p>
                      {viewingAgent.address || "—"}, {viewingAgent.city || "—"},{" "}
                      {viewingAgent.state || "—"}, {viewingAgent.country || "—"},{" "}
                      {viewingAgent.pincode || "—"}
                    </p>
                  </div>

                  <div>
                    <Label className="font-semibold">Trade Licence Number</Label>
                    <p>{viewingAgent.trade_licence}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Trade Licence File</Label>
                    <p><img src={`${viewingAgent.trade_licence_file}`} alt="Trade Licence" className="w-full max-h-64 object-contain rounded border border-gray-200" /></p>
                  </div>

                  <div>
                    <Label className="font-semibold">PAN</Label>
                    <p>{viewingAgent.pan}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">PAN File</Label>
                    <p><img src={`${viewingAgent.pan_file}`} alt="Trade Licence" className="w-full max-h-64 object-contain rounded border border-gray-200" /></p>
                  </div>

                  <div>
                    <Label className="font-semibold">Aadhaar Number</Label>
                    <p>{viewingAgent.aadhaar}</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Aadhaar File</Label>
                    <p><img src={`${viewingAgent.aadhaar_file}`} alt="Trade Licence" className="w-full max-h-64 object-contain rounded border border-gray-200" /></p>
                  </div>

                  <div>
                    <Label className="font-semibold">Commission Rate</Label>
                    <p>{viewingAgent.commission_rate}%</p>
                  </div>

                  <div>
                    <Label className="font-semibold">Created At</Label>
                    <p>{new Date(viewingAgent.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <Label className="font-semibold">Status</Label>
                  <select
                    className="w-full border rounded p-2"
                    value={viewingAgent.status}
                    onChange={(e) => updateAgentStatus(viewingAgent.id, e.target.value)}
                  >
                    <option value="">Select Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <Button onClick={() => setViewingAgent(null)} className="w-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent Code</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.id}>
                <TableCell className="font-mono">{agent.agent_code}</TableCell>
                <TableCell>{agent.company_name}</TableCell>
                <TableCell>{agent.contact_person}</TableCell>
                <TableCell>{agent.email}</TableCell>
                <TableCell>{agent.phone}</TableCell>
                <TableCell>{agent.commission_rate}%</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    agent.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {agent.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(agent)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setViewingAgent(agent);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(agent.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
