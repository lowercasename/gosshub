from functools import wraps
from secrets import token_urlsafe
from flask import Flask, g, request, jsonify, escape
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
app.config.from_object(__name__)

# Import config
app.config.from_file("config.toml", load=toml.load)

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
    creator = ForeignKeyField(User, backref='documents')
    archived = BooleanField(default=False)
    uuid = CharField(unique=True)

class Tag(BaseModel):
    created_date = DateTimeField()
    creator = ForeignKeyField(User, backref='tags')
    name = CharField(unique=True)
    description = TextField()

class Transformation(BaseModel):
    date = DateTimeField()
    document = ForeignKeyField(Document, backref='transformations')
    user = ForeignKeyField(User, backref='transformations')
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

# simple utility function to create tables
def create_tables():
    with database:
        database.create_tables([User, Document, Tag, Transformation, Watch, TransformationToTagMap, Log])

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
@app.route('/')
def homepage():
    return 'Hello, world!'

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
    validate(request.json, 'username', minlength=3, maxlength=40)
    validate(request.json, 'password', match='repeat_password')
    validate(request.json, 'repeat_password')
    validate(request.json, 'email', regex="[^@]+@[^@]+\.[^@]+")
    # Generate salt and hash the password
    hash = pbkdf2_sha256.hash(request.json['password'])
    try:
        with database.atomic():
            user = User.create(
                username=request.json['username'],
                password=hash,
                email=request.json['email'],
                join_date=datetime.datetime.now(),
                is_admin=False,
                is_verified=False,
                verification_token=jwt.encode({ 'username': request.json['username'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1) }, app.config['SECRET_KEY'], algorithm="HS256"))
            print(user.verification_token)
            # Send email with verification token
            # send_email(
            #         to=user.email,
            #         subject='Verify your email on GossHub',
            #         body="Hi!\n\n" +
            #         "To start using GossHub, you must verify your email address. Follow this link:\n" +
            #         "https://gosshub.com/verify-email/" + user.verification_token + "\n\n" +
            #         "This link will expire in 1 hour. If it doesn't work, please request a new verification link here:\n\n" +
            #         "https://gosshub.com/reset-token\n\n" +
            #         "See you soon,\n\n" +
            #         "GossHub")
            log(f"User {user.username} created.", initiator=user)
            return success('User created.')
    except IntegrityError as e:
        print(e)
        raise APIErrorConflict('This username is taken.') 

@app.route('/user')
@token_required
def get_user(auth):
    if request.args and 'username' in request.args:
        validate(request.args, 'username')
        query = User.select(User.username, User.join_date).where(User.username.contains(request.args['username']))
    else:
        query = User.select(User.username, User.join_date)
    if not len(query):
        raise APIErrorNotFound('No matching user found.')
    return jsonify([user for user in query.dicts()])

@app.route('/user', methods=['PUT', 'DELETE'])
@token_required
def modify_user(auth):
    if request.method == 'PUT':
        if request.json:
            for field, new_value in request.json.items():
                setattr(auth, field, new_value)
            auth.save()
            log(f"User {auth.username} edited.", initiator=auth)
            return success('User edited.')
    elif request.method == 'DELETE':
        auth.delete_instance()
        log(f"User {auth.username} deleted.", initiator=auth)
        return success('User deleted.')

@app.route('/login', methods=['POST'])
def login():
    validate(request.json, 'username')
    validate(request.json, 'password')
    try:
        user = User.get(User.username == request.json['username'])
    except DoesNotExist: 
        raise APIErrorNotFound('No user found with this username.')
    user = model_to_dict(user)
    hash_matches = pbkdf2_sha256.verify(request.json['password'], user['password'])
    if not hash_matches:
        raise APIErrorUnauthorized('Username or password incorrect.')
    if not user['is_verified']:
        raise APIErrorUnauthorized('Email address has not been verified.')
    # Create a JWT token for this user
    token = jwt.encode({ 'username': user['username'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1), 'admin': user['is_admin'] }, app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({ 'token': token })

@app.route('/verify-email', methods=['POST'])
def verify_email():
    validate(request.json, 'verification_token')
    try:
        user = User.get((User.verification_token == request.json['verification_token']) & (User.is_verified == False))
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
    validate(request.json, 'email')
    try:
        user = User.get((User.email == request.json['email']) & (User.is_verified == False))
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
        "https://gosshub.com/verify-email/" + user.verification_token + "\n\n" +
        "This link will expire in 1 hour. If it doesn't work, please request a new verification link here:\n\n" +
        "https://gosshub.com/reset-token\n\n" +
        "See you soon,\n\n" +
        "GossHub")
    return success('Token reset.')

@app.route('/document', methods=['GET', 'POST', 'PUT', 'DELETE'])
@token_required
def document(auth):
    if request.method == 'POST':
        validate(request.json, 'body')
        date = datetime.datetime.now()
        # Check there isn't already a document with this UUID
        uuid = shortuuid.uuid()
        while len(Document.select().where(Document.uuid == uuid)) > 0:
            uuid = shortuuid.uuid()
        document = Document.create(
            created_date=date,
            creator = auth,
            uuid = uuid)
        transformation = Transformation.create(
            date=date,
            document=document,
            user=auth,
            body=request.json['body'])
        if 'tags' in request.json:
            tags = [slugify(tag) for tag in request.json['tags'] if len(tag) > 2 and len(tag) < 60]
            print(tags)
        log(f"{auth.username} created a document.", initiator=auth, affected_document=document, visibility='public')
        return success('Document created.')
    elif request.method == 'GET':
        # We want a single document, and all its edit history
        if request.args:
            validate(request.args, 'uuid')
            query = (Document
                    .select(Document.uuid, Transformation.date, Transformation.body, User.username)
                    .where(Document.uuid == request.args['uuid'])
                    .join(Transformation)
                    .join(User)
                    .order_by(Transformation.date.desc()))
            if not len(query.dicts()):
                raise APIErrorNotFound('No matching document found.')
            return jsonify({ "uuid": query[0].uuid, "transformations": [document for document in query.dicts()] })
        # We want all the documents, but just the most recent edit for each
        Creator = User.alias()
        Author = User.alias()
        Latest = Transformation.alias()
        cte = (Latest
                .select(Latest.document_id, fn.MAX(Latest.date).alias('max_date'))
                .group_by(Latest.document_id)
                .cte('latest'))
        predicate = ((Document.id == cte.c.document_id) &
                    (Transformation.date == cte.c.max_date))
        query = (Document
                .select(Document.uuid, Transformation.date.alias('edited_date'), Transformation.body, Author.username.alias('last_edited_by'), Creator.username.alias('created_by'))
                .join(cte, on=predicate)
                .join_from(Document, Transformation)
                .join_from(Document, Creator)
                .join_from(Transformation, Author)
                .order_by(Transformation.date.desc())
                .with_cte(cte))
        return jsonify([document for document in query.dicts()])
    elif request.method == 'PUT':
        validate(request.args, 'uuid')
        validate(request.json, 'body')
        try:
            document = Document.get(Document.uuid == request.args['uuid'])
        except DoesNotExist:
            raise APIErrorNotFound('No matching document found.')
        transformation = Transformation.create(
            date=datetime.datetime.now(),
            document=document,
            user=auth,
            body=request.json['body'])
        log(f"{auth.username} edited a document.", initiator=auth, affected_document=document, visibility='public')
        return success('Document edited.')

# Allow running from the command line
if __name__ == '__main__':
    create_tables()
    app.run()
