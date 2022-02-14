import React from 'react';
import { Link } from 'wouter';

export default ({ slug, count }) => {
    return <Link href={`/tag/${slug}`}><a className='gh-tag'>{slug}{ count ? ` (${count})` : ''}</a></Link>
}
