import { Link } from 'react-router-dom';
import { FiThumbsUp, FiMessageCircle, FiClock, FiEye } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa6';
import { Avatar } from '../common';
import { fmtDate, compact, cn } from '../../lib/utils';

export default function BlogCard({ post, variant }) {
  return (
    <article className={cn('blog-card', variant && `blog-card--${variant}`)}>
      <Link to={`/blogs/${post.slug}`} className="blog-card__media">
        <img src={post.coverImage} alt="" loading="lazy" />
        <span className="badge blog-card__cat">{post.category}</span>
      </Link>
      <div className="blog-card__body">
        <div className="blog-card__meta">
          <span>{fmtDate(post.publishedAt || post.createdAt)}</span>
          <span>
            <FiClock /> {post.readTime} min
          </span>
          {post.ratingCount > 0 && (
            <span>
              <FaStar style={{ color: '#f5a524' }} /> {post.ratingAvg?.toFixed(1)}
            </span>
          )}
        </div>
        <h3>
          <Link to={`/blogs/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.excerpt}</p>
        <div className="blog-card__foot">
          {post.author && (
            <Link to={`/u/${post.author.username}`} className="blog-card__author">
              <Avatar src={post.author.avatar} name={post.author.name} size="sm" />
              <span>{post.author.name}</span>
            </Link>
          )}
          <div className="blog-card__stats">
            <span title="Likes">
              <FiThumbsUp /> {compact(post.likesCount || 0)}
            </span>
            <span title="Comments">
              <FiMessageCircle /> {post.commentCount || 0}
            </span>
            <span title="Views">
              <FiEye /> {compact(post.views || 0)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
