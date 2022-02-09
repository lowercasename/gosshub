from functools import wraps
from secrets import token_urlsafe
from flask import Flask, g, request, jsonify, escape, send_from_directory
from flask_cors import CORS
import jwt
from peewee import *
from playhouse.shortcuts import model_to_dict
from passlib.hash import pbkdf2_sha256
import re
import datetime
import requests
import toml
import shortuuid

# Create Flask instance
app = Flask(__name__)
CORS(app)
# app.config.from_object(__name__)

# Import config
app.config.from_file("config.toml", load=toml.load)
app.static_url_path=app.config.get('STATIC_FOLDER')
app.static_folder=app.root_path + app.static_url_path

# Create PeeWee database instance
database = SqliteDatabase(app.config['DATABASE'])

class BaseModel(Model):
    class Meta:
        database = database

class User(BaseModel):
    username = CharField(unique=True)
    password = CharField()
    email = CharField()
    join_date = DateTimeField()
    is_admin = BooleanField()
    is_verified = BooleanField()
    verification_token = CharField(null=True)

class Document(BaseModel):
    created_date = DateTimeField()
    archived = BooleanField(default=False)
    uuid = CharField(unique=True)

class Tag(BaseModel):
    created_date = DateTimeField()
    creator = ForeignKeyField(User, backref='tags')
    name = CharField(unique=True)
    description = TextField(null=True)

class Transformation(BaseModel):
    date = DateTimeField()
    document = ForeignKeyField(Document, backref='transformations')
    user = ForeignKeyField(User, backref='transformations', null=True)
    body = TextField()

class Watch(BaseModel):
    document = ForeignKeyField(Document, backref='watches')
    user = ForeignKeyField(User, backref='watches')

class TransformationToTagMap(BaseModel):
    transformation = ForeignKeyField(Transformation)
    tag = ForeignKeyField(Tag) 

class Log(BaseModel):
    date = DateTimeField()
    body = CharField()
    initiator = ForeignKeyField(User, backref='logs', null=True)
    affected_user = ForeignKeyField(User, backref='logs', null=True)
    affected_document = ForeignKeyField(Document, backref='logs', null=True)
    visibility=CharField()

class Page(BaseModel):
    slug = CharField(unique=True)
    title = TextField()
    body = TextField()

# simple utility function to create tables
def create_tables():
    with database:
        database.create_tables([User, Document, Tag, Transformation, Watch, TransformationToTagMap, Log, Page])

# Success handler
def success(message="Success", status=200):
    response = {
        "status": status,
        "message": message
    }
    return jsonify(response), status

# Error handlers
class APIErrorBadRequest(Exception):
    status = 400
    description = 'Bad Request'

class APIErrorConflict(Exception):
    status = 409
    description = 'Conflict'

class APIErrorNotFound(Exception):
    status = 404
    description = 'Not Found'

class APIErrorUnauthorized(Exception):
    status = 401
    description = 'Unauthorized'

@app.errorhandler(APIErrorBadRequest)
@app.errorhandler(APIErrorConflict)
@app.errorhandler(APIErrorNotFound)
@app.errorhandler(APIErrorUnauthorized)
def handle_exception(err):
    response = {
        "error": err.description,
        "status": err.status,
        "message": str(err)
    }
    return jsonify(response), err.status

# Utility functions

def pretty_field(field, nocaps=False):
    f = field.replace('_', ' ')
    if not nocaps:
        f = field.capitalize()
    return f

def slugify(text):
    text = text.strip().lower()
    text = re.sub(r"\s+", "-", text, flags = re.MULTILINE)
    text = re.sub(r"[^a-zA-Z0-9-_]+", "", text)
    text = str(escape(text))
    return text

@database.func()
def json_field(field):
    return jsonify(field)

def log(body='', initiator=None, affected_user=None, affected_document=None, visibility='admin'):
    log = Log.create(
        date=datetime.datetime.now(),
        body=body,
        initiator=initiator,
        affected_user=affected_user,
        affected_document=affected_document,
        visibility=visibility)

# Validation
def validate(dictionary, field, minlength=False, maxlength=False, match=False, regex=False):
    if not dictionary:
        raise APIErrorBadRequest('Bad Request.')
    if field not in dictionary or not dictionary[field]:
        raise APIErrorBadRequest(f'{pretty_field(field)} value missing.')
    if (minlength and len(dictionary[field]) < minlength) or (maxlength and len(dictionary[field]) > maxlength):
        raise APIErrorBadRequest(f'{pretty_field(field)} value must be between {str(minlength)} and {str(maxlength)} characters long.')
    if match and dictionary[field] != dictionary[match]:
        raise APIErrorBadRequest(f'{pretty_field(field)} does not match {pretty_field(match, nocaps=True)}.')
    if regex and not re.match(regex, dictionary[field]):
        raise APIErrorBadRequest(f'{pretty_field(field)} has an invalid format.')
    return True

def sanitize(dictionary):
    if not dictionary:
        return
    return { k: v.strip() if type(v) is str else v for k, v in dictionary.items()}

# Email
def send_email(to, subject, body):
    return requests.post(
            "https://api.eu.mailgun.net/v3/mail.gosshub.com/messages",
            auth=("api", app.config['MAILGUN_KEY']),
            data={
                "from": "GossHub <mail@gosshub.com>",
                "to": to,
                "subject": subject,
                "text": body})

# Decorator for JWT-secured routes
def token_required(fn):
    @wraps(fn)
    def decorator(*args, **kwargs):
        token = None
        if not 'Authorization' in request.headers:
            raise APIErrorUnauthorized('Not authorized to access this API.')
        token = request.headers['Authorization'].split()[1]
        if not token:
            raise APIErrorUnauthorized('Not authorized to access this API.')
        try:
            token_data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user = User.get(User.username == token_data['username'])
        except:
            raise APIErrorUnauthorized('Not authorized to access this API.')
        if not user.is_verified:
            raise APIErrorUnauthorized('Not authorized to access this API.')
        return fn(user, *args, **kwargs)
    return decorator

# Request handlers -- these two hooks are provided by flask and we will use them
# to create and tear down a database connection on each request.
@app.before_request
def before_request():
    g.db = database
    g.db.connect()

@app.after_request
def after_request(response):
    g.db.close()
    return response

# Views
# @app.route('/')
# def homepage():
#     return 'Hello, world!'

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def spa(path):
    return app.send_static_file("dist/index.html")

@app.route('/cdn/<path:path>')
def send_file(path):
    print(app.static_folder)
    return send_from_directory(app.static_folder + '/dist', path)

@app.route('/log')
@token_required
def get_logs(auth):
    query = (Log
            .select(Log.body, Log.date, Log.visibility, Document.id)
            .where(Log.visibility == ('admin' if auth.is_admin else 'public'))
            # .join(User, on=Log.affected_user)
            .join(Document, on=Log.affected_document)
            .order_by(Log.date.desc()))
    return jsonify([item for item in query.dicts()])


@app.route('/user', methods=['POST'])
def create_user():
    data = sanitize(request.json) 
    validate(data, 'username', minlength=3, maxlength=40)
    validate(data, 'password', minlength=6, match='repeat_password')
    validate(data, 'repeat_password')
    validate(data, 'email', regex="[^@]+@[^@]+\.[^@]+")
    # Generate salt and hash the password
    hash = pbkdf2_sha256.hash(data['password'])
    try:
        with database.atomic():
            user = User.create(
                username=data['username'],
                password=hash,
                email=data['email'],
                join_date=datetime.datetime.now(),
                is_admin=False,
                is_verified=False,
                verification_token=jwt.encode({ 'username': data['username'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1) }, app.config['SECRET_KEY'], algorithm="HS256"))
            # Send email with verification token
            send_email(
                    to=user.email,
                    subject='Verify your email on GossHub',
                    body="Hi!\n\n" +
                    "To start using GossHub, you must verify your email address. Follow this link:\n" +
                    "https://gosshub.com/verify-email?token=" + user.verification_token + "\n\n" +
                    "This link will expire in 1 hour. If it doesn't work, please request a new verification link here:\n\n" +
                    "https://gosshub.com/reset-token\n\n" +
                    "See you soon,\n\n" +
                    "GossHub")
            log(f"User {user.username} created.", initiator=user, visibility='public')
            return success('User created.')
    except IntegrityError:
        raise APIErrorConflict('This username is taken.') 

@app.route('/user', methods=['GET'])
@token_required
def get_user(auth):
    if request.args and 'username' in request.args:
        validate(request.args, 'username')
        # If we're fetching our own account (or if we're an admin):
        if auth.username == request.args['username'] or auth.is_admin:
            query = User.select(User.id, User.username, User.join_date, User.email, User.is_admin, User.is_verified).where(User.username.contains(request.args['username']))
        else: 
            query = User.select(User.username, User.join_date).where(User.username.contains(request.args['username']))
    else:
        # If we're an admin:
        if auth.is_admin:
            query = User.select(User.id, User.username, User.join_date, User.email, User.is_admin, User.is_verified)
        else: 
            query = User.select(User.username, User.join_date)
    if not len(query):
        raise APIErrorNotFound('No matching user found.')
    return jsonify([user for user in query.dicts()])

@app.route('/user', methods=['PUT', 'DELETE'])
@token_required
def modify_user(auth):
    data = sanitize(request.json)
    if request.method == 'PUT':
        if data:
            # Admin users can specify a target user, otherwise the target is the current user
            if 'id' in data and auth.is_admin:
                try:
                    target_user = User.get_by_id(data['id'])
                except DoesNotExist:
                    raise APIErrorNotFound('No user found with this ID.')
            else:
                target_user = auth
            if 'username' in data:
                # Validate the username first - we do this before we start setting values
                # to prevent ending up in a situation where we change an email and a username
                # together but end up keying the email verification token to the old username.
                validate(data, 'username', minlength=3, maxlength=40)
                existing_user = User.select().where(User.username == data['username'])
                if len(existing_user):
                    raise APIErrorBadRequest('This username is taken.')
                log(f"User {target_user.username} changed their username to {data['username']}.", initiator=auth, visibility='public')
            for field, new_value in data.items():
                if field == 'email':
                    validate(data, 'email', regex="[^@]+@[^@]+\.[^@]+")
                    # Set and send verification token first
                    token_username = data['username'] if 'username' in data else target_user.username
                    target_user.is_verified = False
                    target_user.verification_token = jwt.encode({ 'username': token_username, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1) }, app.config['SECRET_KEY'], algorithm="HS256")
                    send_email(
                        to=new_value,
                        subject='Verify your email on GossHub',
                        body="Hi!\n\n" +
                        "To start using GossHub, you must verify your email address. Follow this link:\n" +
                        "https://gosshub.com/verify-email?token=" + target_user.verification_token + "\n\n" +
                        "This link will expire in 1 hour. If it doesn't work, please request a new verification link here:\n\n" +
                        "https://gosshub.com/reset-token\n\n" +
                        "See you soon,\n\n" +
                        "GossHub")
                elif field == 'password':
                    validate(data, 'password', minlength=6)
                    new_value = pbkdf2_sha256.hash(data['password'])
                setattr(target_user, field, new_value)
            target_user.save()
            return success('User edited.')
        else:
            raise APIErrorBadRequest('No fields specified.')
    elif request.method == 'DELETE':
        # Admin users can specify a target user, otherwise the target is the current user
        if 'id' in request.args and auth.is_admin:
            try:
                target_user = User.get_by_id(request.args['id'])
            except DoesNotExist:
                raise APIErrorNotFound('No user found with this ID.')
        else:
            target_user = auth
        # Free up this user's transformations and logs
        for transformation in target_user.transformations:
            transformation.user = None
            transformation.save()
        # TODO: Free up logs here, too
        target_user.delete_instance()
        log(f"User {target_user.username} deleted.", initiator=auth, visibility='public')
        return success('User deleted.')

@app.route('/login', methods=['POST'])
def login():
    data = sanitize(request.json)
    validate(data, 'username')
    validate(data, 'password')
    try:
        user = User.get(User.username == data['username'])
    except DoesNotExist: 
        raise APIErrorNotFound('No user found with this username.')
    user = model_to_dict(user)
    hash_matches = pbkdf2_sha256.verify(data['password'], user['password'])
    if not hash_matches:
        raise APIErrorUnauthorized('Username or password incorrect.')
    if not user['is_verified']:
        raise APIErrorUnauthorized('Email address has not been verified.')
    # Create a JWT token for this user
    token = jwt.encode({ 'username': user['username'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1), 'admin': user['is_admin'] }, app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({ 'token': token })

@app.route('/verify-email', methods=['POST'])
def verify_email():
    data = sanitize(request.json)
    validate(data, 'verification_token')
    try:
        user = User.get((User.verification_token == data['verification_token']) & (User.is_verified == False))
    except DoesNotExist: 
        raise APIErrorNotFound('No user found with this verification token.')
    try:
        token_data = jwt.decode(user.verification_token, app.config['SECRET_KEY'], algorithms=["HS256"])
    except:
        raise APIErrorBadRequest('This verification token is invalid.')
    user.is_verified = True
    user.verification_token = ""
    user.save()
    log(f"User {user.username} verified their email.", initiator=user)
    return success('Email verified.')

@app.route('/reset-token', methods=['POST'])
def reset_token():
    data = sanitize(request.json)
    validate(data, 'email')
    try:
        user = User.get((User.email == data['email']) & (User.is_verified == False))
    except DoesNotExist: 
        raise APIErrorNotFound('No matching user found.')
    user.verification_token=jwt.encode({ 'username': user.username, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1) }, app.config['SECRET_KEY'], algorithm="HS256")
    user.save()
    # Send email with verification token
    send_email(
        to=user.email,
        subject='Verify your email on GossHub',
        body="Hi!\n\n" +
        "To start using GossHub, you must verify your email address. Follow this link:\n" +
        "https://gosshub.com/verify-email?token=" + user.verification_token + "\n\n" +
        "This link will expire in 1 hour. If it doesn't work, please request a new verification link here:\n\n" +
        "https://gosshub.com/reset-token\n\n" +
        "See you soon,\n\n" +
        "GossHub")
    return success('Token reset.')

@app.route('/document', methods=['GET'])
def get_document():
    # We want a single document, and all its edit history
    if request.args:
        validate(request.args, 'uuid')
        query = (Document
                .select(Document.uuid, Transformation.id, Transformation.date, Transformation.body, User.username)
                .where(Document.uuid == request.args['uuid'])
                .join(Transformation)
                .join(User, JOIN.LEFT_OUTER)
                .order_by(Transformation.date.desc()))

        print(query)
        if not len(query):
            raise APIErrorNotFound('No matching document found.')
        transformations = []
        for transformation in query.dicts():
            tags = []
            tag_mappings = TransformationToTagMap.select().where(TransformationToTagMap.transformation_id == transformation['id'])
            if len(tag_mappings):
                for mapping in tag_mappings:
                    tags.append(Tag.get_by_id(mapping.tag_id).name)
            transformations.append({
                'username': transformation['username'],
                'date': transformation['date'],
                'body': transformation['body'],
                'tags': tags
            })
        return jsonify({
            "uuid": query[0].uuid,
            "transformations": transformations
        })
    # We want all the documents, but just the most recent transformation for each
    Author = User.alias()
    Latest = Transformation.alias()
    cte = (Latest
            .select(Latest.document_id, fn.MAX(Latest.date).alias('max_date'))
            .group_by(Latest.document_id)
            .cte('latest'))
    predicate = ((Document.id == cte.c.document_id) &
                (Transformation.date == cte.c.max_date))
    query = (Document
            .select(Document.uuid, Transformation.id.alias('transformation_id'), Transformation.date, Transformation.body, Author.username)
            .join(cte, on=predicate)
            .join_from(Document, Transformation)
            .join_from(Transformation, Author, JOIN.LEFT_OUTER)
            .order_by(Transformation.date.desc())
            .with_cte(cte))
    response = []
    for document in query.dicts():
        tags = []
        tag_mappings = TransformationToTagMap.select().where(TransformationToTagMap.transformation_id == document['transformation_id'])
        if len(tag_mappings):
            for mapping in tag_mappings:
                tags.append(Tag.get_by_id(mapping.tag_id).name)
        response_document = {
            'uuid': document['uuid'],
            'transformations': [
                {
                    'username': document['username'],
                    'body': document['body'],
                    'date': document['date'],
                    'tags': tags
                }
            ]
        }
        response.append(response_document)
    return jsonify(response)

@app.route('/document', methods=['POST', 'PUT', 'DELETE'])
@token_required
def document(auth):
    if request.method == 'POST':
        data = sanitize(request.json)
        validate(data, 'body')
        date = datetime.datetime.now()
        # Check there isn't already a document with this UUID
        uuid = shortuuid.uuid()
        while len(Document.select().where(Document.uuid == uuid)) > 0:
            uuid = shortuuid.uuid()
        document = Document.create(
            created_date=date,
            uuid = uuid)
        transformation = Transformation.create(
            date=date,
            document=document,
            user=auth,
            body=data['body'])
        if 'tags' in data:
            existing_tags = [tag.name for tag in Tag.select()]
            tags_to_attach = [slugify(tag) for tag in data['tags'] if len(tag) > 1 and len(tag) < 60]
            new_tags = [tag for tag in tags_to_attach if tag not in existing_tags]
            for tag in new_tags:
                new_tag = Tag.create(
                        created_date=datetime.datetime.now(),
                        creator=auth,
                        name=tag)
                log(f"{auth.username} created a tag ({new_tag.name}).", initiator=auth, visibility='public')
            for tag in tags_to_attach:
                tag_field = Tag.get(Tag.name == tag)
                map = TransformationToTagMap.create(transformation=transformation, tag=tag_field)
        log(f"{auth.username} created a document.", initiator=auth, affected_document=document, visibility='public')
        return success('Document created.')
    elif request.method == 'PUT':
        data = sanitize(request.json)
        validate(request.args, 'uuid')
        validate(data, 'body')
        try:
            document = Document.get(Document.uuid == request.args['uuid'])
        except DoesNotExist:
            raise APIErrorNotFound('No matching document found.')
        transformation = Transformation.create(
            date=datetime.datetime.now(),
            document=document,
            user=auth,
            body=data['body'])
        if 'tags' in data:
            existing_tags = [tag.name for tag in Tag.select()]
            tags_to_attach = [slugify(tag) for tag in data['tags'] if len(tag) > 1 and len(tag) < 60]
            new_tags = [tag for tag in tags_to_attach if tag not in existing_tags]
            for tag in new_tags:
                new_tag = Tag.create(
                        created_date=datetime.datetime.now(),
                        creator=auth,
                        name=tag)
                log(f"{auth.username} created a tag ({new_tag.name}).", initiator=auth, visibility='public')
            for tag in tags_to_attach:
                tag_field = Tag.get(Tag.name == tag)
                map = TransformationToTagMap.create(transformation=transformation, tag=tag_field)
        log(f"{auth.username} edited a document.", initiator=auth, affected_document=document, visibility='public')
        return success('Document edited.')
    elif request.method == 'DELETE':
        return success('Endpoint not enabled.')

@app.route('/page', methods=['POST', 'PUT', 'DELETE'])
@token_required
def modify_page(auth):
    if request.method == 'POST':
        # Only allowed for admins
        if not auth.is_admin:
            raise APIErrorUnauthorized('Not authorized to perform this action.')
        data = sanitize(request.json)
        validate(data, 'slug')
        validate(data, 'title')
        validate(data, 'body')
        page = Page.create(
            slug=slugify(data['slug']),
            title=data['title'],
            body=data['body'])
        return success('Page created.')
    elif request.method == 'PUT':
        # Only allowed for admins
        if not auth.is_admin:
            raise APIErrorUnauthorized('Not authorized to perform this action.')
        data = sanitize(request.json)
        validate(request.args, 'slug')
        validate(data, 'body')
        validate(data, 'title')
        try:
            page = Page.get(Page.slug == request.args['slug'])
        except DoesNotExist:
            raise APIErrorNotFound('No matching page found.')
        page.body = data['body']
        page.title = data['title']
        page.save()
        return success('Page edited.')
    elif request.method == 'DELETE':
        # Only allowed for admins
        if not auth.is_admin:
            raise APIErrorUnauthorized('Not authorized to perform this action.')
        validate(request.args, 'slug')
        try:
            page = Page.get(Page.slug == request.args['slug'])
        except DoesNotExist:
            raise APIErrorNotFound('No matching page found.')
        page.delete_instance()
        return success('Page deleted.')

@app.route('/page', methods=['GET'])
def page():
    if request.args:
        validate(request.args, 'slug')
        try:
            page = Page.get(Page.slug == request.args['slug'])
        except DoesNotExist:
            raise APIErrorNotFound('No matching page found.')
        return jsonify({
            'body': page.body,
            'title': page.title,
            'slug': page.slug,
        }) 
    else:
        query = Page.select()
        if not len(query):
            return jsonify([])
        return jsonify([{ 'body': page.body, 'title': page.title, 'slug': page.slug } for page in query])

# Allow running from the command line
if __name__ == '__main__':
    create_tables()
    app.run()
