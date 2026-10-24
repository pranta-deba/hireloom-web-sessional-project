import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { FiSearch, FiTrash2, FiSlash, FiCheckCircle } from 'react-icons/fi';
import { FaGoogle, FaGithub } from 'react-icons/fa6';
import { FiSmartphone, FiKey } from 'react-icons/fi';
import { api, errMsg } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks';
import { Avatar, Pagination, ConfirmDialog, EmptyState } from '../../components/common';
import { fmtDate, timeAgo } from '../../lib/utils';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], page: 1, pages: 1, total: 0 });
  const [del, setDel] = useState(null);
  const q = useDebounce(search, 350);

  const load = useCallback(() => api.get('/admin/users', { params: { search: q || undefined, role: role || undefined, status: status || undefined, page, limit: 10 } }).then(({ data: d }) => setData(d)), [q, role, status, page]);
  useEffect(() => {
    load();
  }, [load]);

  const patch = async (u, body) => {
    try {
      const { data: d } = await api.patch(`/admin/users/${u._id}`, body);
      setData((x) => ({ ...x, items: x.items.map((i) => (i._id === u._id ? d.user : i)) }));
      toast.success('User updated');
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="stack" style={{ '--gap': '20px' }}>
      <div className="admin-head">
        <div>
          <span className="eyebrow">Users</span>
          <h1>Manage members</h1>
        </div>
        <span className="badge badge--brand">{data.total} total</span>
      </div>
      <div className="toolbar" style={{ margin: 0 }}>
        <div className="input-group" style={{ flex: 1, maxWidth: 360 }}>
          <span className="input-group__icon">
            <FiSearch />
          </span>
          <input className="input" placeholder="Search name, username, email, phone" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="select" style={{ maxWidth: 160 }} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
        <select className="select" style={{ maxWidth: 160 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
        </select>
      </div>
      <div className="panel">
        {data.items.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Contact</th>
                  <th>Sign-in</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <div className="user-cell">
                        <Avatar src={u.avatar} name={u.name} />
                        <div>
                          <strong>{u.name}</strong>
                          <small>@{u.username}</small>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '.85rem' }}>
                      {u.email || '—'} {u.emailVerified && <FiCheckCircle style={{ color: 'var(--mint)' }} title="verified" />}
                      <br />
                      <span className="muted">{u.phone || ''}</span>
                    </td>
                    <td>
                      <div className="row" style={{ '--gap': '6px', color: 'var(--ink-2)' }}>
                        {u.providers?.local && <FiKey title="Password" />}
                        {u.providers?.google && <FaGoogle title="Google" />}
                        {u.providers?.github && <FaGithub title="GitHub" />}
                        {u.providers?.phone && <FiSmartphone title="Phone" />}
                      </div>
                      <small className="muted">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : 'never'} · {u.loginCount}×</small>
                    </td>
                    <td>
                      <select className="select" style={{ height: 36, minWidth: 100 }} value={u.role} disabled={u._id === me._id} onChange={(e) => patch(u, { role: e.target.value })}>
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`badge badge--dot ${u.status === 'active' ? 'badge--mint' : 'badge--danger'}`}>{u.status}</span>
                    </td>
                    <td className="muted">{fmtDate(u.createdAt)}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                      {u._id !== me._id && (
                        <>
                          <button className="icon-btn" style={{ display: 'inline-flex' }} title={u.status === 'active' ? 'Ban' : 'Unban'} onClick={() => patch(u, { status: u.status === 'active' ? 'banned' : 'active' })}>
                            {u.status === 'active' ? <FiSlash /> : <FiCheckCircle />}
                          </button>
                          <button className="icon-btn icon-btn--danger" style={{ display: 'inline-flex' }} title="Delete" onClick={() => setDel(u)}>
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel__body">
            <EmptyState icon={<FiSearch />} title="No users found" />
          </div>
        )}
      </div>
      <Pagination page={data.page} pages={data.pages} total={data.total} label="users" onChange={setPage} />
      <ConfirmDialog
        open={!!del}
        onClose={() => setDel(null)}
        title={`Delete @${del?.username}?`}
        message="This permanently deletes the account and all of their résumés, letters, posts, comments and ratings."
        onConfirm={async () => {
          await api.delete(`/admin/users/${del._id}`);
          toast.success('User deleted');
          load();
        }}
      />
    </div>
  );
}
