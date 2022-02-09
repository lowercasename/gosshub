import React, { useState, useEffect } from 'react';
import { apiCall } from './util';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'wouter';

const AdminPanel = () => {

    const [location, setLocation] = useLocation();
    const [user, setUser] = useState(false);
    const [users, setUsers] = useState(false);
    const [pages, setPages] = useState(false);
    const [editorVisible, setEditorVisible] = useState(false);
    const [currentPage, setCurrentPage] = useState(false);
    const [pageBody, setPageBody] = useState('');
    const [pageSlug, setPageSlug] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const username = useSelector(state => state.user.username);

    const handleAdminCheckbox = (event, id) => {
        apiCall('/user', true, 'put', { id, is_admin: event.target.checked })
            // .then(() => setUsers(users.map(user => user.id === id ? { ...user, is_admin: event.target_checked } : user)))
            .then(() => window.location.reload() );
    }
    const handleVerifiedCheckbox = (event, id) => {
        apiCall('/user', true, 'put', { id, is_verified: event.target.checked })
            .then(() => window.location.reload() );
    }

    const handleDeletePage = (slug) => {
        apiCall(`/page?slug=${slug}`, true, 'delete')
            .then(() => window.location.reload() );
    }
    const handleEditPage = () => {
        apiCall(`/page?slug=${currentPage}`, true, 'put', { body: pageBody, title: pageTitle })
            .then(() => window.location.reload() );
    }
    const handleCreatePage = () => {
        apiCall('/page', true, 'post', { slug: pageSlug, title: pageTitle, body: pageBody })
            .then(() => window.location.reload() );
    }

    const handleDeleteUser = (id) => {
        apiCall(`/user?id=${id}`, true, 'delete')
            .then(() => window.location.reload() );
    }
    
    useEffect(() => {
        if (!username) return;
        apiCall(`/user?username=${username}`, true)
            .then(data => {
                if (data[0].is_admin !== true) {
                   setLocation('/'); 
                }
                setUser(data[0]);
                apiCall(`/user`, true)
                    .then(data => setUsers(data))
                apiCall(`/page`, true)
                    .then(data => setPages(data))
            }) 
            .catch(() => setLocation('/'))
    }, [username]);

    return (
        <>
        <h2>Admin Panel</h2>
        
        { users && <>
        <h3>Users</h3>
        <table>
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Email address</th>
                    <th>Admin</th>
                    <th>Verified</th>
                    <th>Controls</th>
                </tr>
            </thead>
            <tbody>
                { users.map(user => (
                    <tr key={user.id} >
                        <td>{ user.username }</td> 
                        <td>{ user.email }</td>
                        <td><input type="checkbox" checked={ user.is_admin } onChange={(e) => handleAdminCheckbox(e, user.id)} /></td> 
                        <td><input type="checkbox" checked={ user.is_verified } onChange={(e) => handleVerifiedCheckbox(e, user.id)} /></td> 
                        <td>
                            <button className='gh-button' onClick={() => handleDeleteUser(user.id)}><i className="fas fa-trash"></i></button>
                        </td>
                    </tr> 
                )) }
            </tbody>
        </table>
        </>}
        <h3>Pages</h3>
        { pages && <>
        <table>
            <thead>
                <tr>
                    <th>Slug</th>
                    <th>Title</th>
                    <th>Controls</th>
                </tr>
            </thead>
            <tbody>
                { pages.map(page => (
                    <tr key={page.slug}>
                        <td>{ page.slug }</td> 
                        <td>{ page.title }</td> 
                        <td>
                            <button className='gh-button' onClick={() => { setEditorVisible(true); setPageBody(page.body); setPageTitle(page.title); setCurrentPage(page.slug); }}><i className="fas fa-edit"></i></button>
                            <button className='gh-button' onClick={() => handleDeletePage(page.slug) }><i className="fas fa-trash"></i></button>
                        </td>
                    </tr> 
                )) }
            </tbody>
        </table>
        </>}
        <button className='gh-button' onClick={() => { setEditorVisible(true); setCurrentPage(false) } }>New Page</button>

        { editorVisible && 
            <div className="modal__backdrop">
                <div className="modal">
                    <div className="document-editor">
                        { !currentPage && <input type="text" placeholder="Page slug" value={pageSlug} onChange={(e) => setPageSlug(e.currentTarget.value) }/> }
                        <input type="text" placeholder="Page title" value={pageTitle} onChange={(e) => setPageTitle(e.currentTarget.value) }/>
                        <textarea placeholder="Page content" value={pageBody} onChange={(e) => setPageBody(e.currentTarget.value)} />
                        <div className="document-editor__controls">
                            <button className="gh-button" onClick={() => setEditorVisible(false)}>Exit editor</button>
                            <button className="gh-button" onClick={() => currentPage ? handleEditPage() : handleCreatePage() }>Save changes</button>
                        </div>
                    </div>
                </div>
            </div>
        }
        </>
    )
}

export default AdminPanel;
